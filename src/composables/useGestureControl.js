import { createGestureActions } from '../gesture/gestureActions.js';
import { createGestureStateMachine } from '../gesture/gestureStateMachine.js';
import { centroid, velocityFromPoints } from '../gesture/landmarkMath.js';
import { createMediaPipeHandRuntime, getMediaPipeAssetPaths } from '../gesture/mediaPipeRuntime.js';
import { drawGestureOverlay } from '../gesture/overlayRenderer.js';
import { classifyHandPose } from '../gesture/poseClassifier.js';

const DEFAULT_PERMISSION_STATE = 'idle';

const toActionLabel = (action) => {
  if (!action) return '';
  return action.replaceAll('_', ' ');
};

const getNowIso = () => new Date().toISOString();

function resolveBoolOption(option, fallback = false) {
  if (typeof option === 'function') return Boolean(option());
  if (option && typeof option === 'object' && 'value' in option) return Boolean(option.value);
  if (typeof option === 'boolean') return option;
  return fallback;
}

export function useGestureControl(options = {}) {
  const cameraVideoRef = Vue.ref(null);
  const overlayCanvasRef = Vue.ref(null);

  const cameraReady = Vue.ref(false);
  const cameraEnabled = Vue.ref(false);
  const permissionState = Vue.ref(DEFAULT_PERMISSION_STATE);
  const cameraError = Vue.ref('');

  const focusedControlKey = Vue.ref(options.initialFocusedControlKey || null);

  const activeGesture = Vue.ref('idle');
  const gestureConfidence = Vue.ref(0);
  const adjustVelocity = Vue.ref(0);
  const lastAction = Vue.ref('');
  const lastActionAt = Vue.ref('');
  const gestureDebug = Vue.reactive({
    deltaXRaw: 0,
    deltaXAdjusted: 0,
    mirrored: resolveBoolOption(options.mirrorX, true),
    interpretedSwipe: 'none',
  });

  let stream = null;
  let runtime = null;
  let rafId = null;
  let lastFrameTs = 0;
  let lastProcessedTs = 0;
  const handCenters = new Map();

  const processFps = Number(options.processFps) > 0 ? Number(options.processFps) : 45;
  const minProcessIntervalMs = 1000 / processFps;

  const stateMachine = createGestureStateMachine();
  const actions = createGestureActions({
    getFocusedControl: () => focusedControlKey.value,
    getControlMeta: (key) => options.getControlMeta?.(key),
    isControlAdjustable: (key) => {
      if (!options.isControlAdjustable) return true;
      return Boolean(options.isControlAdjustable(key));
    },
    onSwipeLeft: () => {
      options.onSwipeLeft?.();
    },
    onSwipeRight: () => {
      options.onSwipeRight?.();
    },
    onAdjust: (key, delta) => {
      options.onAdjustControl?.(key, delta);
    },
    onTransportStart: () => {
      options.onTransportStart?.();
    },
    onTransportStop: () => {
      options.onTransportStop?.();
    },
  });

  const shouldDrawDebugOverlay = () => resolveBoolOption(options.debugEnabled, false);
  const shouldDrawLandmarksOverlay = () => resolveBoolOption(options.overlayEnabled, true) || shouldDrawDebugOverlay();
  const isPreviewMirrored = () => resolveBoolOption(options.mirrorX, true);

  function markAction(action) {
    lastAction.value = toActionLabel(action);
    lastActionAt.value = getNowIso();
  }

  function clearOverlay() {
    const canvas = overlayCanvasRef.value;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    g?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resetGestureState() {
    activeGesture.value = 'idle';
    gestureConfidence.value = 0;
    adjustVelocity.value = 0;
    gestureDebug.deltaXRaw = 0;
    gestureDebug.deltaXAdjusted = 0;
    gestureDebug.interpretedSwipe = 'none';
    gestureDebug.mirrored = isPreviewMirrored();
    stateMachine.reset();
  }

  function stopGestureLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastFrameTs = 0;
    lastProcessedTs = 0;
    handCenters.clear();
    resetGestureState();
    clearOverlay();
  }

  function normalizeHands(result, timestampMs) {
    const landmarksList = Array.isArray(result?.landmarks) ? result.landmarks : [];
    const handednesses = Array.isArray(result?.handednesses) ? result.handednesses : [];

    const frameHands = [];
    const dtSec = lastFrameTs ? Math.max(0.001, (timestampMs - lastFrameTs) / 1000) : 0;

    for (let i = 0; i < landmarksList.length; i += 1) {
      const landmarks = landmarksList[i];
      const handedness = handednesses?.[i]?.[0];
      const handTag = handedness?.categoryName || `hand-${i}`;
      const score = handedness?.score || 0;
      const center = centroid(landmarks);

      const previousCenter = handCenters.get(handTag);
      const velocity = velocityFromPoints(previousCenter, center, dtSec);
      handCenters.set(handTag, center);

      const pose = classifyHandPose(landmarks);
      frameHands.push({
        id: handTag,
        handedness: handTag,
        score,
        center,
        velocity,
        landmarks,
        pose: pose.pose,
        confidence: pose.confidence,
      });
    }

    const frameIds = new Set(frameHands.map((hand) => hand.id));
    for (const knownId of handCenters.keys()) {
      if (!frameIds.has(knownId)) handCenters.delete(knownId);
    }

    lastFrameTs = timestampMs;
    frameHands.sort((a, b) => b.confidence - a.confidence);
    return frameHands;
  }

  function updateAdjustVelocity(target) {
    const next = Number.isFinite(target) ? target : 0;
    adjustVelocity.value = adjustVelocity.value + (next - adjustVelocity.value) * 0.28;
    if (Math.abs(adjustVelocity.value) < 0.0001) adjustVelocity.value = 0;
  }

  function frameLoop(timestampMs) {
    if (!cameraEnabled.value || !runtime || !cameraVideoRef.value) return;

    if (lastProcessedTs && timestampMs - lastProcessedTs < minProcessIntervalMs) {
      rafId = requestAnimationFrame(frameLoop);
      return;
    }

    lastProcessedTs = timestampMs;

    try {
      const result = runtime.detectForVideo(cameraVideoRef.value, timestampMs);
      const hands = normalizeHands(result, timestampMs);
      const outcome = stateMachine.update({
        timestampMs,
        hands,
        mirrorX: isPreviewMirrored(),
      });
      const applied = actions.apply(outcome.events);

      activeGesture.value = outcome.activeGesture;
      gestureConfidence.value = outcome.confidence;
      updateAdjustVelocity(applied.latestAdjustVelocity);

      gestureDebug.deltaXRaw = outcome.debug?.deltaXRaw || 0;
      gestureDebug.deltaXAdjusted = outcome.debug?.deltaXAdjusted || 0;
      gestureDebug.interpretedSwipe = outcome.debug?.interpretedSwipe || 'none';
      gestureDebug.mirrored = Boolean(outcome.debug?.mirrored);

      if (applied.latestAction) {
        markAction(applied.latestAction);
      } else {
        updateAdjustVelocity(0);
      }

      if (shouldDrawLandmarksOverlay()) {
        drawGestureOverlay({
          canvas: overlayCanvasRef.value,
          video: cameraVideoRef.value,
          hands,
          hud: shouldDrawDebugOverlay()
            ? {
                activeGesture: activeGesture.value,
                focusedControlKey: focusedControlKey.value,
                confidence: gestureConfidence.value,
              }
            : null,
        });
      } else {
        clearOverlay();
      }
    } catch (error) {
      cameraError.value = `Gesture loop failed: ${error.message}`;
      disableCamera();
      return;
    }

    rafId = requestAnimationFrame(frameLoop);
  }

  function startGestureLoop() {
    if (!cameraEnabled.value || rafId || !runtime) return;
    rafId = requestAnimationFrame(frameLoop);
  }

  async function enableCamera() {
    if (cameraEnabled.value) return;
    const video = cameraVideoRef.value;

    if (!video) {
      cameraError.value = 'Camera element is not mounted yet.';
      permissionState.value = 'error';
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraError.value = 'getUserMedia is unavailable in this browser.';
      permissionState.value = 'error';
      return;
    }

    permissionState.value = 'requesting';
    cameraError.value = '';

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    } catch (error) {
      permissionState.value = error?.name === 'NotAllowedError' ? 'denied' : 'error';
      cameraError.value = `Camera request failed: ${error.message}`;
      return;
    }

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    try {
      await video.play();
    } catch (error) {
      permissionState.value = 'error';
      cameraError.value = `Unable to start camera preview: ${error.message}`;
      disableCamera();
      return;
    }

    try {
      runtime = await createMediaPipeHandRuntime();
    } catch (error) {
      permissionState.value = 'error';
      cameraError.value = `${error.message}. Place MediaPipe assets under src/assets/mediapipe/.`;
      disableCamera();
      return;
    }

    permissionState.value = 'granted';
    cameraEnabled.value = true;
    cameraReady.value = true;
    markAction('camera_enabled');
    startGestureLoop();
  }

  function disableCamera() {
    stopGestureLoop();

    if (runtime) {
      runtime.close();
      runtime = null;
    }

    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }

    if (cameraVideoRef.value) {
      cameraVideoRef.value.srcObject = null;
    }

    cameraEnabled.value = false;
    cameraReady.value = false;
    if (permissionState.value === 'granted' || permissionState.value === 'requesting') {
      permissionState.value = 'idle';
    }
  }

  function setFocusedControl(key) {
    focusedControlKey.value = key || null;
  }

  function getAssetInfo() {
    return getMediaPipeAssetPaths();
  }

  Vue.onBeforeUnmount(() => {
    disableCamera();
  });

  return {
    cameraVideoRef,
    overlayCanvasRef,
    cameraReady,
    cameraEnabled,
    permissionState,
    cameraError,
    activeGesture,
    focusedControlKey,
    gestureConfidence,
    adjustVelocity,
    lastAction,
    lastActionAt,
    gestureDebug,
    enableCamera,
    disableCamera,
    startGestureLoop,
    stopGestureLoop,
    setFocusedControl,
    getAssetInfo,
  };
}
