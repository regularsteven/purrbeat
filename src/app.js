import { CORE_CONTROLS, formatCoreControlValue, getCoreControlByKey } from './config/coreControls.js';
import { useGestureControl } from './composables/useGestureControl.js';
import { usePurrEngine } from './composables/usePurrEngine.js';

export const App = {
  setup() {
    const engine = usePurrEngine();
    const configText = Vue.ref(engine.configJson.value);

    Vue.watch(engine.configJson, (value) => {
      configText.value = value;
    });

    const pasteApply = () => {
      try {
        engine.applyConfig(configText.value);
      } catch {
        alert('Invalid JSON');
      }
    };

    const gesture = useGestureControl({
      controls: CORE_CONTROLS,
      onAdjustControl: (key, delta) => engine.nudgeCoreParam(key, delta),
      onTransportStart: () => {
        engine.start();
      },
      onTransportStop: () => {
        engine.stop();
      },
      isControlAdjustable: (key) => !(key === 'pulseHz' && engine.params.syncToBpm),
    });

    const coreControls = CORE_CONTROLS;

    const focusedControlMeta = Vue.computed(() => getCoreControlByKey(gesture.focusedControlKey.value));
    const focusedControlLabel = Vue.computed(() => focusedControlMeta.value?.label || 'n/a');

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

    const toggleCameraControl = async () => {
      if (gesture.cameraEnabled.value) {
        gesture.disableCamera();
        return;
      }
      await gesture.enableCamera();
    };

    const onCoreInput = (key, value) => {
      gesture.setFocusedControl(key);
      engine.setCoreParam(key, Number(value));
    };

    const isControlFocused = (key) => gesture.focusedControlKey.value === key;
    const isControlDisabled = (key) => key === 'pulseHz' && engine.params.syncToBpm;
    const formatControlValue = (control) => formatCoreControlValue(control.key, engine.params[control.key]);

    const mediapipeAssets = gesture.getAssetInfo();

    return {
      ...engine,
      ...gesture,
      configText,
      pasteApply,
      coreControls,
      focusedControlLabel,
      cameraStatusClass,
      toggleCameraControl,
      onCoreInput,
      isControlFocused,
      isControlDisabled,
      formatControlValue,
      mediapipeAssets,
    };
  },
  template: `
  <main class="min-h-screen bg-slate-950 p-6 text-slate-100">
    <div class="mx-auto grid max-w-6xl gap-4">
      <section class="rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-bold">Cat Purr Simulator</h1>
            <p class="text-sm text-slate-400">Binaural purr prototype with kick sequencing, JSON preset tools, and camera gestures.</p>
          </div>
          <div class="rounded-full border border-white/10 px-3 py-1 text-xs">{{ running ? 'running' : 'stopped' }}</div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button class="rounded-lg bg-blue-500/30 px-3 py-2 text-sm font-semibold" :disabled="running" @click="start">Start</button>
          <button class="rounded-lg bg-red-500/30 px-3 py-2 text-sm font-semibold" :disabled="!running" @click="stop">Stop</button>
          <button class="rounded-lg border border-white/10 px-3 py-2 text-sm" @click="randomize">Random</button>
          <button class="rounded-lg border border-white/10 px-3 py-2 text-sm" @click="applyProfile('soft')">Soft</button>
          <button class="rounded-lg border border-white/10 px-3 py-2 text-sm" @click="applyProfile('sleepy')">Sleepy</button>
          <button class="rounded-lg border border-white/10 px-3 py-2 text-sm" @click="applyProfile('motor')">Motor</button>
          <button class="rounded-lg border border-white/10 px-3 py-2 text-sm" @click="applyProfile('therapy')">Therapy</button>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-slate-900/90 p-4">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold">Core controls</h2>
          <div class="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-xs">
            Focus: {{ focusedControlLabel }}
          </div>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div
            v-for="control in coreControls"
            :key="control.key"
            class="rounded-lg border p-2 transition"
            :class="isControlFocused(control.key) ? 'border-emerald-300/60 bg-emerald-400/10' : 'border-white/10 bg-black/20'"
          >
            <label class="text-xs">
              {{ control.label }} {{ formatControlValue(control) }}
              <input
                :value="params[control.key]"
                @input="onCoreInput(control.key, $event.target.value)"
                :disabled="isControlDisabled(control.key)"
                @pointerdown="setFocusedControl(control.key)"
                type="range"
                :min="control.min"
                :max="control.max"
                :step="control.step"
                class="w-full"
              />
            </label>
          </div>
        </div>
        <div class="mt-2 flex items-center gap-3 text-sm">
          <label><input v-model="params.syncToBpm" @change="applyParams" type="checkbox" /> Sync pulse</label>
          <select v-model.number="params.pulseDiv" @change="applyParams" class="rounded bg-black/30 p-1">
            <option :value="0.5">1/2</option><option :value="1">1/4</option><option :value="2">1/8</option><option :value="4">1/16</option>
          </select>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-slate-900/90 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold">Camera Gesture Control</h2>
            <p class="text-xs text-slate-400">One open palm swipes focus. Index up/down adjusts focused control. Two-hand open/fist toggles transport.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full border px-2 py-1 text-xs" :class="cameraStatusClass">{{ permissionState }}</span>
            <button class="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold" @click="toggleCameraControl">{{ cameraEnabled ? 'Disable Camera Control' : 'Enable Camera Control' }}</button>
          </div>
        </div>

        <div class="mt-3 grid gap-3 lg:grid-cols-[1.65fr,1fr]">
          <div class="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/50">
            <video ref="cameraVideoRef" autoplay playsinline muted class="h-full w-full object-cover -scale-x-100"></video>
            <canvas ref="overlayCanvasRef" class="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"></canvas>
          </div>

          <div class="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p>Focused control: <span class="text-emerald-200">{{ focusedControlLabel }}</span></p>
            <p>Active gesture: <span class="text-cyan-200">{{ activeGesture }}</span></p>
            <p>Confidence: {{ Math.round(gestureConfidence * 100) }}%</p>
            <p>Adjust velocity: {{ adjustVelocity.toFixed(2) }} units/s</p>
            <p>Last action: {{ lastAction || 'n/a' }}</p>
            <p>Last action at: {{ lastActionAt || 'n/a' }}</p>
            <p class="mt-2 text-slate-400">Runtime ready: {{ cameraReady ? 'yes' : 'no' }}</p>
            <p class="text-slate-400">Model: {{ mediapipeAssets.modelUrl }}</p>
            <p v-if="cameraError" class="mt-2 text-rose-200">{{ cameraError }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-slate-900/90 p-4">
        <div class="mb-2 flex items-center justify-between"><h2 class="font-semibold">Kick Sequencer</h2><span class="text-xs text-slate-400">{{ seqPos }}</span></div>
        <div class="mb-2 flex flex-wrap gap-2">
          <label><input v-model="params.kickOn" @change="applyParams" type="checkbox" /> Kick on</label>
          <button class="rounded border border-white/10 px-2" @click="setPattern('clear')">Clear</button>
          <button class="rounded border border-white/10 px-2" @click="setPattern('simple')">Simple</button>
          <button class="rounded border border-white/10 px-2" @click="setPattern('four')">Four</button>
          <button class="rounded border border-white/10 px-2" @click="setPattern('random')">Random</button>
        </div>
        <div class="grid gap-2 text-xs md:grid-cols-3">
          <label>Level {{ params.kickLevel.toFixed(2) }}<input v-model.number="params.kickLevel" @input="applyParams" type="range" min="0" max="1" step="0.01" class="w-full" /></label>
          <label>Decay {{ Math.round(params.kickDecayMs) }}<input v-model.number="params.kickDecayMs" @input="applyParams" type="range" min="40" max="600" step="1" class="w-full" /></label>
          <label>Swing {{ params.swing.toFixed(2) }}<input v-model.number="params.swing" @input="applyParams" type="range" min="0" max="0.6" step="0.01" class="w-full" /></label>
        </div>
        <div class="mt-3 grid gap-2">
          <div v-for="bar in 4" :key="bar">
            <div class="mb-1 text-xs text-slate-400">Bar {{ bar }}</div>
            <div class="grid grid-cols-8 gap-1 md:grid-cols-16">
              <button v-for="s in 16" :key="s" class="h-6 rounded border" :class="[(params.kickPattern[(bar-1)*16+(s-1)] ? 'bg-blue-400/40 border-blue-300/50':'bg-white/5 border-white/10'), (stepIndex === (bar-1)*16+(s-1) ? 'ring-2 ring-emerald-400/60':'')]" @click="toggleStep((bar-1)*16+(s-1))" />
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-slate-900/90 p-4">
        <canvas ref="scopeCanvas" width="900" height="180" class="w-full rounded-lg border border-white/10 bg-black/30"></canvas>
      </section>

      <section class="grid gap-3 md:grid-cols-2">
        <div class="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
          <p>Audio: {{ audioState }}</p><p>Sample rate: {{ sampleRate }}</p><p>Left: {{ leftHz.toFixed(2) }} Hz</p><p>Right: {{ rightHz.toFixed(2) }} Hz</p>
        </div>
        <div class="rounded-xl border border-white/10 bg-black/20 p-3">
          <textarea v-model="configText" class="h-44 w-full rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-xs"></textarea>
          <div class="mt-2 flex gap-2">
            <button class="rounded border border-white/10 px-2 py-1 text-xs" @click="copyConfig">Copy</button>
            <button class="rounded border border-white/10 px-2 py-1 text-xs" @click="pasteApply">Apply</button>
            <button class="rounded border border-white/10 px-2 py-1 text-xs" @click="reset">Reset</button>
          </div>
        </div>
      </section>
    </div>
  </main>`,
};
