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

    percussionTracks: { type: Array, required: true },
    totalSteps: { type: Number, required: true },

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
    onToggleTrackEnabled: { type: Function, required: true },
    onToggleTrackStep: { type: Function, required: true },
    onSetTrackPattern: { type: Function, required: true },
    appVersion: { type: String, required: true },
  },
  data() {
    return {
      menuOpen: false,
    };
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
    stepIsActive(track, step) {
      return Boolean(track.pattern?.[step]);
    },
    toggleMenu() {
      this.menuOpen = !this.menuOpen;
    },
  },
  template: `
  <main
    class="relative min-h-screen overflow-hidden bg-slate-900 text-slate-100"
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

    <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-800/10 to-slate-900/85"></div>

    <section
      class="absolute inset-0 flex flex-col justify-between px-3 py-3 sm:px-5 sm:py-5"
      style="padding-top: max(0.75rem, env(safe-area-inset-top)); padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
    >
      <div class="space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="rounded-2xl border border-white/15 bg-slate-900/50 px-3 py-2 shadow-lg backdrop-blur-sm">
            <p class="text-[0.65rem] uppercase tracking-[0.16em] text-cyan-200/90">Bank</p>
            <p class="text-lg font-semibold text-white">{{ activeBankLabel }}</p>
          </div>

          <div class="relative">
            <button
              class="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55"
              @click="toggleMenu"
              :aria-expanded="menuOpen ? 'true' : 'false'"
              aria-label="Toggle controls menu"
            >
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </button>

            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="translate-x-4 opacity-0"
              enter-to-class="translate-x-0 opacity-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="translate-x-0 opacity-100"
              leave-to-class="translate-x-4 opacity-0"
            >
              <div
                v-if="menuOpen"
                class="pointer-events-auto absolute right-0 mt-2 w-[min(84vw,18rem)] rounded-2xl border border-white/15 bg-slate-900/90 p-3 text-xs shadow-2xl backdrop-blur-md"
              >
                <div class="mb-3 flex items-center justify-between gap-2">
                  <span class="rounded-full border px-2 py-1" :class="cameraStatusClass">{{ permissionState }}</span>
                  <p class="text-[0.65rem] uppercase tracking-[0.12em] text-slate-300">v{{ appVersion }}</p>
                </div>
                <label class="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                  <span>Camera</span>
                  <input type="checkbox" :checked="cameraEnabled" @change="onToggleCamera" />
                </label>
                <label class="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                  <span>Debug</span>
                  <input type="checkbox" :checked="debugMode" @change="onToggleDebug" />
                </label>
                <label class="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                  <span>Landmarks</span>
                  <input type="checkbox" :checked="showLandmarks" @change="onToggleLandmarks" />
                </label>
                <label class="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                  <span>Mirror</span>
                  <input type="checkbox" :checked="mirroredPreview" @change="onToggleMirror" />
                </label>
              </div>
            </transition>
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
        <div class="pointer-events-auto grid max-h-[32vh] gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/52 p-2 shadow-2xl backdrop-blur-md sm:grid-cols-2 lg:grid-cols-3">
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

        <div v-if="activeBankKey === 'kick'" class="pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/70 p-2 shadow-xl backdrop-blur-sm">
          <div class="mb-2 flex items-center justify-between gap-3">
            <div>
              <p class="text-[0.65rem] uppercase tracking-[0.16em] text-cyan-200/90">Percussion sequencer</p>
              <p class="text-xs text-slate-300">{{ totalSteps }} total steps • horizontal scroll on mobile</p>
            </div>
            <div class="flex flex-wrap gap-1.5 text-xs">
              <button class="rounded-md border border-white/20 px-2 py-1" @click="onSetPattern('clear')">Clear kick</button>
              <button class="rounded-md border border-white/20 px-2 py-1" @click="onSetPattern('simple')">Simple kick</button>
              <button class="rounded-md border border-white/20 px-2 py-1" @click="onSetPattern('four')">4-on-floor</button>
              <button class="rounded-md border border-white/20 px-2 py-1" @click="onSetPattern('random')">Rnd kick</button>
            </div>
          </div>

          <div class="space-y-2 overflow-x-auto pb-1">
            <article
              v-for="track in percussionTracks"
              :key="track.key"
              class="min-w-[540px] rounded-xl border border-white/10 bg-black/35 p-2"
            >
              <div class="mb-2 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <p class="text-xs font-semibold text-white">{{ track.label }}</p>
                  <button
                    class="rounded-md border px-2 py-0.5 text-[0.65rem]"
                    :class="track.enabled ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100' : 'border-white/20 bg-black/30 text-slate-300'"
                    @click="onToggleTrackEnabled(track.key)"
                  >{{ track.enabled ? 'On' : 'Off' }}</button>
                </div>
                <div class="flex gap-1 text-[0.65rem]">
                  <button class="rounded border border-white/20 px-1.5 py-0.5" @click="onSetTrackPattern(track.key, 'clear')">Clear</button>
                  <button class="rounded border border-white/20 px-1.5 py-0.5" @click="onSetTrackPattern(track.key, 'simple')">Simple</button>
                  <button class="rounded border border-white/20 px-1.5 py-0.5" @click="onSetTrackPattern(track.key, 'backbeat')">Backbeat</button>
                  <button class="rounded border border-white/20 px-1.5 py-0.5" @click="onSetTrackPattern(track.key, 'random')">Random</button>
                </div>
              </div>

              <div class="grid grid-flow-col auto-cols-[1rem] gap-1">
                <button
                  v-for="step in totalSteps"
                  :key="step"
                  class="h-6 rounded border transition"
                  :class="stepIsActive(track, step - 1) ? 'border-cyan-200/80 bg-cyan-300/45' : 'border-white/15 bg-white/5'"
                  @click="onToggleTrackStep(track.key, step - 1)"
                  :title="track.label + ' step ' + step"
                ></button>
              </div>
            </article>
          </div>
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
