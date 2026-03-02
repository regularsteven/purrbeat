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
    handCount: { type: Number, default: 0 },

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
  computed: {
    visibleCarouselControls() {
      const controls = this.activeControls;
      if (!controls.length) return [];
      const focusIdx = Math.min(
        controls.findIndex((c) => this.isControlFocused(c.key)),
        controls.length - 1
      );
      const safeFocus = focusIdx >= 0 ? focusIdx : 0;
      const half = 2;
      let start = Math.max(0, safeFocus - half);
      let end = Math.min(controls.length, start + 5);
      if (end - start < 5) start = Math.max(0, end - 5);
      return controls.slice(start, end).map((c, i) => ({
        control: c,
        scale: this.carouselScale(i, start, safeFocus),
        distance: Math.abs(start + i - safeFocus),
      }));
    },
    banksActive() {
      return this.handCount >= 2;
    },
    controlsActive() {
      return this.handCount === 1;
    },
  },
  methods: {
    carouselScale(idx, start, focusIdx) {
      const distance = Math.abs(start + idx - focusIdx);
      if (distance === 0) return 1.1;
      if (distance === 1) return 0.85;
      return 0.55;
    },
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
    class="hud-root relative min-h-screen overflow-hidden bg-black text-slate-100"
    style="font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;"
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

    <div class="pointer-events-none absolute inset-0 hud-scrim"></div>

    <section
      class="absolute inset-0 flex flex-col justify-between px-3 py-3 sm:px-6 sm:py-5"
      style="padding-top: max(0.75rem, env(safe-area-inset-top)); padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
    >
      <header class="hud-top">
        <div
          class="hud-banks"
          :class="{ 'hud-banks-active': banksActive }"
        >
          <button
            v-for="(bank, index) in banks"
            :key="bank.key"
            class="hud-bank"
            :class="{
              'hud-bank-active': index === activeBankIndex,
              'hud-bank-inactive': index !== activeBankIndex,
            }"
            @click="onSelectBank(index)"
          >
            <span class="hud-bank-label">{{ bank.label }}</span>
          </button>
        </div>

        <div class="relative">
          <button
            class="hud-menu-btn"
            @click="toggleMenu"
            :aria-expanded="menuOpen ? 'true' : 'false'"
            aria-label="Toggle controls menu"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
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
              class="hud-menu-panel"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <span class="rounded-full border px-2 py-1 text-[0.65rem]" :class="cameraStatusClass">{{ permissionState }}</span>
                <p class="text-[0.6rem] uppercase tracking-widest text-cyan-400/70">v{{ appVersion }}</p>
              </div>
              <label class="hud-menu-item">
                <span>Camera</span>
                <input type="checkbox" :checked="cameraEnabled" @change="onToggleCamera" />
              </label>
              <label class="hud-menu-item">
                <span>Debug</span>
                <input type="checkbox" :checked="debugMode" @change="onToggleDebug" />
              </label>
              <label class="hud-menu-item">
                <span>Landmarks</span>
                <input type="checkbox" :checked="showLandmarks" @change="onToggleLandmarks" />
              </label>
              <label class="hud-menu-item">
                <span>Mirror</span>
                <input type="checkbox" :checked="mirroredPreview" @change="onToggleMirror" />
              </label>
            </div>
          </transition>
        </div>
      </header>

      <div class="hud-bottom" :class="{ 'hud-controls-active': controlsActive }">
        <div v-if="activeBankKey === 'kick'" class="hud-perc-section">
          <div class="mb-2 flex items-center justify-between gap-3">
            <p class="text-[0.6rem] uppercase tracking-[0.2em] text-cyan-400/80">Percussion</p>
            <div class="flex flex-wrap gap-1 text-[0.6rem]">
              <button class="hud-btn-sm" @click="onSetPattern('clear')">Clear</button>
              <button class="hud-btn-sm" @click="onSetPattern('simple')">Simple</button>
              <button class="hud-btn-sm" @click="onSetPattern('four')">4-on-floor</button>
              <button class="hud-btn-sm" @click="onSetPattern('random')">Random</button>
            </div>
          </div>
          <div class="space-y-2 overflow-x-auto pb-1">
            <article
              v-for="track in percussionTracks"
              :key="track.key"
              class="hud-perc-track"
            >
              <div class="mb-2 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <p class="text-[0.7rem] font-medium text-cyan-100">{{ track.label }}</p>
                  <button
                    class="hud-toggle-sm"
                    :class="track.enabled ? 'hud-toggle-on' : 'hud-toggle-off'"
                    @click="onToggleTrackEnabled(track.key)"
                  >{{ track.enabled ? 'On' : 'Off' }}</button>
                </div>
                <div class="flex gap-1 text-[0.55rem]">
                  <button class="hud-btn-xs" @click="onSetTrackPattern(track.key, 'clear')">Clr</button>
                  <button class="hud-btn-xs" @click="onSetTrackPattern(track.key, 'simple')">Sim</button>
                  <button class="hud-btn-xs" @click="onSetTrackPattern(track.key, 'backbeat')">Bk</button>
                  <button class="hud-btn-xs" @click="onSetTrackPattern(track.key, 'random')">Rnd</button>
                </div>
              </div>
              <div class="grid grid-flow-col auto-cols-[0.875rem] gap-0.5">
                <button
                  v-for="step in totalSteps"
                  :key="step"
                  class="hud-step"
                  :class="stepIsActive(track, step - 1) ? 'hud-step-on' : 'hud-step-off'"
                  @click="onToggleTrackStep(track.key, step - 1)"
                  :title="track.label + ' step ' + step"
                ></button>
              </div>
            </article>
          </div>
        </div>

        <div v-else class="hud-carousel-wrap">
          <div class="hud-carousel">
            <article
              v-for="({ control, scale, distance }) in visibleCarouselControls"
              :key="control.key"
              class="hud-control-card"
              :class="{
                'hud-control-focused': isControlFocused(control.key),
                'hud-control-adjacent': distance === 1,
                'hud-control-far': distance >= 2,
              }"
              :style="{ transform: 'scale(' + scale + ')' }"
              @pointerdown="onFocusControl(control.key)"
            >
              <div class="hud-control-header">
                <h3 class="hud-control-label">{{ control.label }}</h3>
                <span v-if="isControlFocused(control.key)" class="hud-control-value">{{ formatControlDisplay(control) }}</span>
              </div>

              <div v-if="control.type === 'number'" class="hud-control-body">
                <input
                  class="hud-slider"
                  type="range"
                  :min="control.min"
                  :max="control.max"
                  :step="control.step"
                  :value="control.value"
                  :disabled="isControlDisabled(control.key)"
                  @pointerdown.stop="onFocusControl(control.key)"
                  @input="onSliderInput(control, $event)"
                />
              </div>

              <div v-else-if="control.type === 'toggle'" class="hud-control-body">
                <button
                  class="hud-toggle"
                  :class="control.value ? 'hud-toggle-on' : 'hud-toggle-off'"
                  @click="onToggleControl(control.key)"
                >
                  {{ control.value ? 'On' : 'Off' }}
                </button>
              </div>

              <div v-else-if="control.type === 'enum'" class="hud-control-body hud-enum-wrap">
                <button
                  v-for="option in control.options"
                  :key="String(option)"
                  class="hud-enum-btn"
                  :class="option === control.value ? 'hud-enum-active' : ''"
                  @click="onEnumSelect(control.key, option)"
                >
                  {{ control.optionLabels?.[option] || option }}
                </button>
              </div>
            </article>
          </div>
        </div>

        <div class="hud-transport">
          <button
            class="hud-transport-btn"
            :class="running ? 'hud-transport-stop' : 'hud-transport-start'"
            @click.prevent="toggleTransport"
          >{{ running ? 'Stop' : 'Start' }}</button>
          <button class="hud-action-btn" @click="onRandomize">Random</button>
          <button class="hud-action-btn" @click="onApplyProfile('soft')">Soft</button>
          <button class="hud-action-btn" @click="onApplyProfile('sleepy')">Sleepy</button>
          <button class="hud-action-btn" @click="onApplyProfile('motor')">Motor</button>
          <button class="hud-action-btn" @click="onApplyProfile('therapy')">Therapy</button>
        </div>

        <div v-if="transportError" class="hud-error">
          {{ transportError }}
        </div>

        <div v-if="debugMode" class="hud-debug">
          <p>gesture: <span class="text-cyan-300">{{ activeGesture }}</span></p>
          <p>confidence: {{ confidencePct(gestureConfidence) }}%</p>
          <p>hands: {{ handCount }}</p>
          <p>adjust velocity: {{ adjustVelocity.toFixed(2) }}</p>
          <p>last action: {{ lastAction || 'n/a' }}</p>
          <p>deltaX raw: {{ Number(gestureDebug.deltaXRaw || 0).toFixed(3) }}</p>
          <p>deltaX adjusted: {{ Number(gestureDebug.deltaXAdjusted || 0).toFixed(3) }}</p>
          <p>interpreted swipe: {{ gestureDebug.interpretedSwipe || 'none' }}</p>
          <p v-if="cameraError" class="col-span-2 text-rose-300">{{ cameraError }}</p>
        </div>
      </div>
    </section>
  </main>`,
};
