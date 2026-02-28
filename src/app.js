import { isCoreControlKey } from './config/coreControls.js';
import {
  CONTROL_BANKS,
  CONTROL_CATALOG,
  clampControlValue,
  formatControlValue,
  getControlByKey,
  getEnumStepValue,
} from './config/controlBanks.js';
import { CameraOverlayView } from './components/CameraOverlayView.js';
import { useGestureControl } from './composables/useGestureControl.js';
import { usePurrEngine } from './composables/usePurrEngine.js';

const DISCRETE_GESTURE_COOLDOWN_MS = 240;

const clampIndex = (index, size) => {
  if (!size) return 0;
  return ((index % size) + size) % size;
};

const toNumericDeltaSign = (delta) => (delta >= 0 ? 1 : -1);

export const App = {
  components: {
    CameraOverlayView,
  },
  setup() {
    const engine = usePurrEngine();

    const controlState = Vue.reactive(
      CONTROL_CATALOG.map((control) => ({
        ...control,
        value: null,
      })),
    );
    const controlByKey = new Map(controlState.map((control) => [control.key, control]));

    const overlayStore = Vue.reactive({
      activeBankIndex: 0,
      activeControlIndex: 0,
      controls: controlState,
      gestureState: {
        lastDirection: 'idle',
        velocity: 0,
        confidence: 0,
        deltaXRaw: 0,
        deltaXAdjusted: 0,
        mirrored: true,
        interpretedSwipe: 'none',
      },
    });

    const debugMode = Vue.ref(false);
    const showLandmarks = Vue.ref(true);
    const mirroredPreview = Vue.ref(true);
    const transportError = Vue.ref('');

    const perBankControlIndex = Vue.reactive(CONTROL_BANKS.map(() => 0));
    const discreteGestureAt = new Map();
    let manualTransportLockUntil = 0;

    const activeBank = Vue.computed(() => CONTROL_BANKS[overlayStore.activeBankIndex] || CONTROL_BANKS[0]);
    const activeBankKey = Vue.computed(() => activeBank.value?.key || 'transport');

    const activeControls = Vue.computed(() => {
      const keys = activeBank.value?.controls || [];
      return keys.map((key) => controlByKey.get(key)).filter(Boolean);
    });

    const activeControl = Vue.computed(() => {
      const controls = activeControls.value;
      if (!controls.length) return null;
      const safeIndex = Math.min(overlayStore.activeControlIndex, controls.length - 1);
      return controls[safeIndex] || controls[0];
    });

    const activeControlLabel = Vue.computed(() => activeControl.value?.label || 'n/a');
    const activeControlDisplay = Vue.computed(() => {
      const control = activeControl.value;
      if (!control) return 'n/a';
      return formatControlValue(control, control.value);
    });

    let gesture = null;

    function syncFocusToActiveControl() {
      const control = activeControl.value;
      if (!control || !gesture) return;
      gesture.setFocusedControl(control.key);
    }

    function setActiveControlIndex(index) {
      const controls = activeControls.value;
      if (!controls.length) return;
      overlayStore.activeControlIndex = clampIndex(index, controls.length);
      perBankControlIndex[overlayStore.activeBankIndex] = overlayStore.activeControlIndex;
      syncFocusToActiveControl();
    }

    function setActiveControlByKey(key) {
      if (!key) return;

      const currentIndex = activeControls.value.findIndex((control) => control.key === key);
      if (currentIndex !== -1) {
        setActiveControlIndex(currentIndex);
        return;
      }

      const bankIndex = CONTROL_BANKS.findIndex((bank) => bank.controls.includes(key));
      if (bankIndex === -1) return;
      setActiveBank(bankIndex);

      const nextIndex = activeControls.value.findIndex((control) => control.key === key);
      if (nextIndex !== -1) setActiveControlIndex(nextIndex);
    }

    function setActiveBank(index) {
      const bankCount = CONTROL_BANKS.length;
      const normalized = clampIndex(index, bankCount);

      perBankControlIndex[overlayStore.activeBankIndex] = overlayStore.activeControlIndex;
      overlayStore.activeBankIndex = normalized;

      const nextBankSize = (CONTROL_BANKS[normalized]?.controls || []).length;
      const nextControlIndex = Math.min(perBankControlIndex[normalized] || 0, Math.max(0, nextBankSize - 1));
      overlayStore.activeControlIndex = nextControlIndex;

      syncFocusToActiveControl();
    }

    const isControlDisabled = (key) => key === 'pulseHz' && engine.params.syncToBpm;

    function setControlValue(key, rawValue) {
      const control = controlByKey.get(key);
      if (!control) return;

      if (control.type === 'number') {
        if (isControlDisabled(key)) return;
        const clamped = clampControlValue(control, rawValue);
        if (isCoreControlKey(key)) {
          engine.setCoreParam(key, clamped);
          return;
        }

        engine.params[key] = clamped;
        engine.applyParams();
        return;
      }

      if (control.type === 'toggle') {
        engine.params[key] = Boolean(rawValue);
        engine.applyParams();
        return;
      }

      if (control.type === 'enum') {
        engine.params[key] = rawValue;
        engine.applyParams();
      }
    }

    function shouldApplyDiscreteGesture(key, nowMs) {
      const lastAt = discreteGestureAt.get(key) || 0;
      if (nowMs - lastAt < DISCRETE_GESTURE_COOLDOWN_MS) return false;
      discreteGestureAt.set(key, nowMs);
      return true;
    }

    function nudgeControlValue(key, delta) {
      const control = controlByKey.get(key);
      if (!control) return;

      if (control.type === 'number') {
        const currentValue = Number(control.value);
        setControlValue(key, currentValue + Number(delta));
        return;
      }

      const now = performance.now();
      if (!shouldApplyDiscreteGesture(key, now)) return;

      const sign = toNumericDeltaSign(Number(delta));
      if (control.type === 'toggle') {
        setControlValue(key, sign > 0);
        return;
      }

      if (control.type === 'enum') {
        const nextValue = getEnumStepValue(control, control.value, sign);
        setControlValue(key, nextValue);
      }
    }

    function formatDisplay(control) {
      return formatControlValue(control, control.value);
    }

    function isFocused(key) {
      return activeControl.value?.key === key;
    }

    function onNumberInput(key, value) {
      setActiveControlByKey(key);
      setControlValue(key, value);
    }

    function onToggleControl(key) {
      setActiveControlByKey(key);
      const control = controlByKey.get(key);
      setControlValue(key, !Boolean(control?.value));
    }

    function onEnumSelect(key, value) {
      setActiveControlByKey(key);
      setControlValue(key, value);
    }

    const cameraStatusClass = Vue.computed(() => {
      if (gesture.permissionState.value === 'granted' && gesture.cameraEnabled.value) {
        return 'border-emerald-300/30 bg-emerald-400/20 text-emerald-100';
      }
      if (gesture.permissionState.value === 'denied' || gesture.permissionState.value === 'error') {
        return 'border-rose-300/30 bg-rose-500/20 text-rose-100';
      }
      if (gesture.permissionState.value === 'requesting') {
        return 'border-amber-300/30 bg-amber-500/20 text-amber-100';
      }
      return 'border-white/20 bg-white/5 text-slate-200';
    });

    const isTransportGestureAllowed = () => performance.now() >= manualTransportLockUntil;

    async function handleStart() {
      manualTransportLockUntil = performance.now() + 900;
      transportError.value = '';
      try {
        await engine.start();
      } catch (error) {
        transportError.value = `Audio start failed: ${error?.message || String(error)}`;
        console.error('[transport] start failed', error);
      }
    }

    function handleStop() {
      manualTransportLockUntil = performance.now() + 450;
      transportError.value = '';
      try {
        engine.stop();
      } catch (error) {
        transportError.value = `Audio stop failed: ${error?.message || String(error)}`;
        console.error('[transport] stop failed', error);
      }
    }

    gesture = useGestureControl({
      initialFocusedControlKey: activeControl.value?.key || CONTROL_BANKS[0]?.controls?.[0] || null,
      getControlMeta: (key) => controlByKey.get(key) || getControlByKey(key),
      isControlAdjustable: (key) => {
        const control = controlByKey.get(key);
        if (!control) return false;
        if (!control.gestureAdjustable) return false;
        if (key === 'pulseHz' && engine.params.syncToBpm) return false;
        return true;
      },
      onSwipeLeft: () => setActiveBank(overlayStore.activeBankIndex - 1),
      onSwipeRight: () => setActiveBank(overlayStore.activeBankIndex + 1),
      onAdjustControl: (key, delta) => nudgeControlValue(key, delta),
      onTransportStart: () => {
        if (!isTransportGestureAllowed()) return;
        handleStart();
      },
      onTransportStop: () => {
        if (!isTransportGestureAllowed()) return;
        handleStop();
      },
      mirrorX: () => mirroredPreview.value,
      debugEnabled: () => debugMode.value,
      overlayEnabled: () => showLandmarks.value,
      processFps: 45,
    });

    const toggleCameraControl = async () => {
      if (gesture.cameraEnabled.value) {
        gesture.disableCamera();
        return;
      }
      await gesture.enableCamera();
    };

    const toggleDebugMode = () => {
      debugMode.value = !debugMode.value;
    };

    const toggleLandmarks = () => {
      showLandmarks.value = !showLandmarks.value;
    };

    const toggleMirrorMode = () => {
      mirroredPreview.value = !mirroredPreview.value;
    };

    const setCameraVideoEl = (el) => {
      gesture.cameraVideoRef.value = el;
    };

    const setOverlayCanvasEl = (el) => {
      gesture.overlayCanvasRef.value = el;
    };

    Vue.watchEffect(() => {
      for (const control of controlState) {
        control.value = engine.params[control.key];
      }
    });

    Vue.watchEffect(() => {
      overlayStore.gestureState.lastDirection = gesture.activeGesture.value;
      overlayStore.gestureState.velocity = gesture.adjustVelocity.value;
      overlayStore.gestureState.confidence = gesture.gestureConfidence.value;
      overlayStore.gestureState.deltaXRaw = gesture.gestureDebug.deltaXRaw;
      overlayStore.gestureState.deltaXAdjusted = gesture.gestureDebug.deltaXAdjusted;
      overlayStore.gestureState.mirrored = gesture.gestureDebug.mirrored;
      overlayStore.gestureState.interpretedSwipe = gesture.gestureDebug.interpretedSwipe;
    });

    Vue.watch(
      () => [overlayStore.activeBankIndex, overlayStore.activeControlIndex],
      () => {
        syncFocusToActiveControl();
      },
      { immediate: true },
    );

    return {
      ...engine,
      ...gesture,
      debugMode,
      showLandmarks,
      mirroredPreview,
      banks: CONTROL_BANKS,
      overlayStore,
      activeBankLabel: Vue.computed(() => activeBank.value?.label || 'n/a'),
      activeBankKey,
      activeControls,
      activeControlLabel,
      activeControlDisplay,
      transportError,
      cameraStatusClass,
      toggleCameraControl,
      toggleDebugMode,
      toggleLandmarks,
      toggleMirrorMode,
      handleStart,
      handleStop,
      setCameraVideoEl,
      setOverlayCanvasEl,
      setActiveBank,
      setActiveControlByKey,
      onNumberInput,
      onToggleControl,
      onEnumSelect,
      isFocused,
      isControlDisabled,
      formatDisplay,
    };
  },
  template: `
  <CameraOverlayView
    :set-camera-video-el="setCameraVideoEl"
    :set-overlay-canvas-el="setOverlayCanvasEl"
    :camera-enabled="cameraEnabled"
    :permission-state="permissionState"
    :camera-status-class="cameraStatusClass"
    :camera-error="cameraError"
    :transport-error="transportError"
    :running="running"

    :debug-mode="debugMode"
    :show-landmarks="showLandmarks"
    :mirrored-preview="mirroredPreview"

    :banks="banks"
    :active-bank-index="overlayStore.activeBankIndex"
    :active-bank-label="activeBankLabel"
    :active-bank-key="activeBankKey"

    :active-control-label="activeControlLabel"
    :active-control-display="activeControlDisplay"

    :active-controls="activeControls"
    :is-control-focused="isFocused"
    :is-control-disabled="isControlDisabled"
    :format-control-display="formatDisplay"

    :active-gesture="activeGesture"
    :gesture-confidence="gestureConfidence"
    :adjust-velocity="adjustVelocity"
    :last-action="lastAction"
    :last-action-at="lastActionAt"
    :gesture-debug="overlayStore.gestureState"

    :on-toggle-camera="toggleCameraControl"
    :on-toggle-debug="toggleDebugMode"
    :on-toggle-landmarks="toggleLandmarks"
    :on-toggle-mirror="toggleMirrorMode"
    :on-select-bank="setActiveBank"
    :on-focus-control="setActiveControlByKey"
    :on-number-input="onNumberInput"
    :on-toggle-control="onToggleControl"
    :on-enum-select="onEnumSelect"

    :on-toggle-transport="running ? handleStop : handleStart"
    :on-randomize="randomize"
    :on-apply-profile="applyProfile"
    :on-set-pattern="setPattern"
  />`,
};
