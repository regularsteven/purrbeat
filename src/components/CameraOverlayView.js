export const CameraOverlayView = {
  props: {
    setCameraVideoEl: { type: Function, required: true },
    setOverlayCanvasEl: { type: Function, required: true },
    cameraEnabled: { type: Boolean, required: true },
    permissionState: { type: String, required: true },
    cameraStatusClass: { type: String, required: true },
    cameraError: { type: String, required: true },
    transportError: { type: String, default: '' },
    running: { type: Boolean, required: true },

    debugMode: { type: Boolean, required: true },
    showLandmarks: { type: Boolean, required: true },
    mirroredPreview: { type: Boolean, required: true },

    banks: { type: Array, required: true },
    activeBankIndex: { type: Number, required: true },
    activeBankLabel: { type: String, required: true },
    activeBankKey: { type: String, required: true },

    activeControlLabel: { type: String, required: true },
    activeControlDisplay: { type: String, required: true },

    activeControls: { type: Array, required: true },
    isControlFocused: { type: Function, required: true },
    isControlDisabled: { type: Function, required: true },
    formatControlDisplay: { type: Function, required: true },

    activeGesture: { type: String, required: true },
    gestureConfidence: { type: Number, required: true },
    adjustVelocity: { type: Number, required: true },
    lastAction: { type: String, default: '' },
    lastActionAt: { type: String, default: '' },
    gestureDebug: { type: Object, required: true },

    onToggleCamera: { type: Function, required: true },
    onToggleDebug: { type: Function, required: true },
    onToggleLandmarks: { type: Function, required: true },
    onToggleMirror: { type: Function, required: true },
    onSelectBank: { type: Function, required: true },
    onFocusControl: { type: Function, required: true },
    onNumberInput: { type: Function, required: true },
    onToggleControl: { type: Function, required: true },
    onEnumSelect: { type: Function, required: true },

    onToggleTransport: { type: Function, required: true },
    onRandomize: { type: Function, required: true },
    onApplyProfile: { type: Function, required: true },
    onSetPattern: { type: Function, required: true },
  },
  methods: {
    onSliderInput(control, event) {
      this.onNumberInput(control.key, Number(event.target.value));
    },
    toggleTransport() {
      this.onToggleTransport?.();
    },
    confidencePct(value) {
      return Math.round((Number(value) || 0) * 100);
    },
  },
  template: `
  <main
    class="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100"
    style="font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;"
  >
    <video
      :ref="setCameraVideoEl"
      autoplay
      playsinline
      muted
      class="absolute inset-0 h-full w-full object-cover"
      :class="mirroredPreview ? '-scale-x-100' : ''"
    ></video>

    <canvas
      :ref="setOverlayCanvasEl"
      class="pointer-events-none absolute inset-0 h-full w-full"
      :class="[mirroredPreview ? '-scale-x-100' : '', (showLandmarks || debugMode) ? 'opacity-100' : 'opacity-0']"
    ></canvas>

    <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-900/10 to-slate-950/85"></div>

    <section
      class="absolute inset-0 flex flex-col justify-between px-3 py-3 sm:px-5 sm:py-5"
      style="padding-top: max(0.75rem, env(safe-area-inset-top)); padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
    >
      <div class="space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="rounded-2xl border border-white/15 bg-slate-900/50 px-3 py-2 shadow-lg backdrop-blur-sm">
            <p class="text-[0.65rem] uppercase tracking-[0.16em] text-cyan-200/90">Bank</p>
            <p class="text-lg font-semibold text-white">{{ activeBankLabel }}</p>
            <p class="text-xs text-slate-200">Focused: <span class="text-amber-200">{{ activeControlLabel }}</span></p>
            <p class="text-xs text-slate-300">Value: {{ activeControlDisplay }}</p>
            <p class="text-xs text-slate-300">Transport: <span :class="running ? 'text-emerald-200' : 'text-slate-300'">{{ running ? 'Running' : 'Stopped' }}</span></p>
          </div>

          <div class="flex max-w-[56vw] flex-wrap justify-end gap-2 text-xs">
            <span class="rounded-full border px-2 py-1" :class="cameraStatusClass">{{ permissionState }}</span>
            <button class="pointer-events-auto rounded-full border border-white/20 bg-black/35 px-3 py-1.5" @click="onToggleCamera">
              {{ cameraEnabled ? 'Camera off' : 'Camera on' }}
            </button>
            <button class="pointer-events-auto rounded-full border border-white/20 bg-black/35 px-3 py-1.5" @click="onToggleDebug">
              {{ debugMode ? 'Debug off' : 'Debug on' }}
            </button>
            <button class="pointer-events-auto rounded-full border border-white/20 bg-black/35 px-3 py-1.5" @click="onToggleLandmarks">
              {{ showLandmarks ? 'Landmarks on' : 'Landmarks off' }}
            </button>
            <button class="pointer-events-auto rounded-full border border-white/20 bg-black/35 px-3 py-1.5" @click="onToggleMirror">
              {{ mirroredPreview ? 'Mirror on' : 'Mirror off' }}
            </button>
          </div>
        </div>

        <div class="pointer-events-auto flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="(bank, index) in banks"
            :key="bank.key"
            class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
            :class="index === activeBankIndex ? 'border-cyan-300/80 bg-cyan-300/20 text-cyan-50 shadow-lg shadow-cyan-900/40' : 'border-white/20 bg-black/20 text-slate-200'"
            @click="onSelectBank(index)"
          >
            {{ bank.label }}
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <div class="pointer-events-auto grid gap-2 rounded-2xl border border-white/10 bg-slate-900/52 p-2 shadow-2xl backdrop-blur-md sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="control in activeControls"
            :key="control.key"
            class="rounded-xl border bg-black/35 p-2 transition duration-150"
            :class="isControlFocused(control.key) ? 'border-amber-300/85 shadow-lg shadow-amber-900/45 scale-[1.02]' : 'border-white/10'"
            @pointerdown="onFocusControl(control.key)"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <h3 class="text-xs font-semibold tracking-wide text-white">{{ control.label }}</h3>
              <span class="text-xs text-amber-100">{{ formatControlDisplay(control) }}</span>
            </div>

            <div v-if="control.type === 'number'">
              <input
                class="w-full accent-cyan-300"
                type="range"
                :min="control.min"
                :max="control.max"
                :step="control.step"
                :value="control.value"
                :disabled="isControlDisabled(control.key)"
                @pointerdown="onFocusControl(control.key)"
                @input="onSliderInput(control, $event)"
              />
            </div>

            <div v-else-if="control.type === 'toggle'" class="flex items-center justify-between gap-2">
              <button
                class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
                :class="control.value ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100' : 'border-white/20 bg-black/30 text-slate-200'"
                @click="onToggleControl(control.key)"
              >
                {{ control.value ? 'On' : 'Off' }}
              </button>
              <p class="text-[0.7rem] text-slate-300">Up = on, down = off</p>
            </div>

            <div v-else-if="control.type === 'enum'" class="flex flex-wrap gap-1.5">
              <button
                v-for="option in control.options"
                :key="String(option)"
                class="rounded-lg border px-2.5 py-1 text-xs transition"
                :class="option === control.value ? 'border-cyan-300/80 bg-cyan-300/20 text-cyan-100' : 'border-white/20 bg-black/25 text-slate-200'"
                @click="onEnumSelect(control.key, option)"
              >
                {{ control.optionLabels?.[option] || option }}
              </button>
            </div>
          </article>
        </div>

        <div class="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-2 text-xs shadow-xl backdrop-blur-sm">
          <button
            class="rounded-lg px-3 py-1.5 font-semibold"
            :class="running ? 'bg-rose-400/25 text-rose-100' : 'bg-emerald-400/25 text-emerald-100'"
            @click.prevent="toggleTransport"
          >{{ running ? 'Stop playback' : 'Start playback' }}</button>
          <button class="rounded-lg border border-white/20 px-3 py-1.5" @click="onRandomize">Random</button>
          <button class="rounded-lg border border-white/20 px-3 py-1.5" @click="onApplyProfile('soft')">Soft</button>
          <button class="rounded-lg border border-white/20 px-3 py-1.5" @click="onApplyProfile('sleepy')">Sleepy</button>
          <button class="rounded-lg border border-white/20 px-3 py-1.5" @click="onApplyProfile('motor')">Motor</button>
          <button class="rounded-lg border border-white/20 px-3 py-1.5" @click="onApplyProfile('therapy')">Therapy</button>

          <template v-if="activeBankKey === 'kick'">
            <span class="mx-1 h-4 w-px bg-white/20"></span>
            <button class="rounded-lg border border-white/20 px-2 py-1" @click="onSetPattern('clear')">Clear</button>
            <button class="rounded-lg border border-white/20 px-2 py-1" @click="onSetPattern('simple')">Simple</button>
            <button class="rounded-lg border border-white/20 px-2 py-1" @click="onSetPattern('four')">Four</button>
            <button class="rounded-lg border border-white/20 px-2 py-1" @click="onSetPattern('random')">Random</button>
          </template>
        </div>

        <div v-if="transportError" class="pointer-events-auto rounded-xl border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-xs text-rose-100">
          {{ transportError }}
        </div>

        <div v-if="debugMode" class="pointer-events-auto grid gap-1 rounded-2xl border border-cyan-300/25 bg-slate-950/70 p-3 text-xs text-slate-200 backdrop-blur-sm sm:grid-cols-2">
          <p>gesture: <span class="text-cyan-200">{{ activeGesture }}</span></p>
          <p>confidence: {{ confidencePct(gestureConfidence) }}%</p>
          <p>adjust velocity: {{ adjustVelocity.toFixed(2) }}</p>
          <p>last action: {{ lastAction || 'n/a' }}</p>
          <p>deltaX raw: {{ Number(gestureDebug.deltaXRaw || 0).toFixed(3) }}</p>
          <p>deltaX adjusted: {{ Number(gestureDebug.deltaXAdjusted || 0).toFixed(3) }}</p>
          <p>mirrored: {{ gestureDebug.mirrored ? 'true' : 'false' }}</p>
          <p>interpreted swipe: {{ gestureDebug.interpretedSwipe || 'none' }}</p>
          <p class="sm:col-span-2">last action at: {{ lastActionAt || 'n/a' }}</p>
          <p v-if="cameraError" class="sm:col-span-2 text-rose-200">{{ cameraError }}</p>
        </div>
      </div>
    </section>
  </main>`,
};
