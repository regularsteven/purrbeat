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
    onSetPattern: { type: Function, default: () => {} },
    onToggleTrackEnabled: { type: Function, required: true },
    onToggleTrackStep: { type: Function, required: true },
    onSetTrackPattern: { type: Function, required: true },
    onApplyDrumPreset: { type: Function, default: () => {} },
    onClearAllPatterns: { type: Function, default: () => {} },
    getControl: { type: Function, default: () => null },
    appVersion: { type: String, required: true },
  },
  data() {
    return {
      menuOpen: false,
      globalPercOpen: false,
      expandedTracks: { kick: false, snare: false, hihatClosed: false, hihatOpen: false },
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
    toggleGlobalPerc() {
      this.globalPercOpen = !this.globalPercOpen;
    },
    toggleTrackTuning(trackKey) {
      this.expandedTracks[trackKey] = !this.expandedTracks[trackKey];
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
          <button
            class="hud-perc-global-toggle"
            @click="toggleGlobalPerc"
            :aria-expanded="globalPercOpen"
          >
            <span class="text-[0.6rem] uppercase tracking-[0.2em] text-cyan-400/80">Global (BPM, Swing, Bars, Segments)</span>
            <svg class="hud-perc-chevron" :class="{ 'hud-perc-chevron-open': globalPercOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div v-if="globalPercOpen" class="hud-perc-global-panel">
              <div class="hud-perc-global-grid">
                <div v-if="getControl('bpm')" class="hud-perc-control">
                  <label class="hud-perc-control-label">{{ getControl('bpm').label }}</label>
                  <input
                    class="hud-slider"
                    type="range"
                    :min="getControl('bpm').min"
                    :max="getControl('bpm').max"
                    :step="getControl('bpm').step"
                    :value="getControl('bpm').value"
                    @input="onNumberInput('bpm', Number($event.target.value))"
                  />
                  <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('bpm')) }}</span>
                </div>
                <div v-if="getControl('swing')" class="hud-perc-control">
                  <label class="hud-perc-control-label">{{ getControl('swing').label }}</label>
                  <input
                    class="hud-slider"
                    type="range"
                    :min="getControl('swing').min"
                    :max="getControl('swing').max"
                    :step="getControl('swing').step"
                    :value="getControl('swing').value"
                    @input="onNumberInput('swing', Number($event.target.value))"
                  />
                  <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('swing')) }}</span>
                </div>
                <div v-if="getControl('loopBars')" class="hud-perc-control">
                  <label class="hud-perc-control-label">{{ getControl('loopBars').label }}</label>
                  <div class="flex flex-wrap gap-1">
                    <button
                      v-for="opt in getControl('loopBars').options"
                      :key="opt"
                      class="hud-enum-btn"
                      :class="opt === getControl('loopBars').value ? 'hud-enum-active' : ''"
                      @click="onEnumSelect('loopBars', opt)"
                    >{{ opt }}</button>
                  </div>
                </div>
                <div v-if="getControl('segmentsPerBar')" class="hud-perc-control">
                  <label class="hud-perc-control-label">{{ getControl('segmentsPerBar').label }}</label>
                  <div class="flex flex-wrap gap-1">
                    <button
                      v-for="opt in getControl('segmentsPerBar').options"
                      :key="opt"
                      class="hud-enum-btn"
                      :class="opt === getControl('segmentsPerBar').value ? 'hud-enum-active' : ''"
                      @click="onEnumSelect('segmentsPerBar', opt)"
                    >{{ getControl('segmentsPerBar').optionLabels?.[opt] || opt }}</button>
                  </div>
                </div>
              </div>
            </div>
          </transition>

          <div class="mb-2 mt-2 flex items-center justify-between gap-2">
            <p class="text-[0.6rem] uppercase tracking-[0.2em] text-cyan-400/80">Presets</p>
            <div class="flex flex-wrap gap-1 text-[0.6rem]">
              <button class="hud-btn-sm" @click="onClearAllPatterns">Clear</button>
              <button class="hud-btn-sm" @click="onApplyDrumPreset('rock')">Rock</button>
              <button class="hud-btn-sm" @click="onApplyDrumPreset('metal')">Metal</button>
              <button class="hud-btn-sm" @click="onApplyDrumPreset('sync')">Sync</button>
              <button class="hud-btn-sm" @click="onApplyDrumPreset('shuffle')">Shuffle</button>
            </div>
          </div>

          <div class="space-y-2 overflow-x-auto pb-1">
            <article
              v-for="track in percussionTracks"
              :key="track.key"
              class="hud-perc-track"
            >
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <p class="text-[0.7rem] font-medium text-cyan-100">{{ track.label }}</p>
                  <button
                    class="hud-toggle-sm"
                    :class="track.enabled ? 'hud-toggle-on' : 'hud-toggle-off'"
                    @click="onToggleTrackEnabled(track.key)"
                  >{{ track.enabled ? 'On' : 'Off' }}</button>
                  <button
                    class="hud-perc-tune-btn"
                    :class="{ 'hud-perc-tune-open': expandedTracks[track.key] }"
                    @click="toggleTrackTuning(track.key)"
                    :aria-expanded="expandedTracks[track.key]"
                  >
                    Tuning
                    <svg class="hud-perc-chevron sm" :class="{ 'hud-perc-chevron-open': expandedTracks[track.key] }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                </div>
                <div class="flex gap-1 text-[0.55rem]">
                  <button class="hud-btn-xs" @click="onSetTrackPattern(track.key, 'clear')">Clr</button>
                  <button class="hud-btn-xs" @click="onSetTrackPattern(track.key, 'simple')">Sim</button>
                  <button class="hud-btn-xs" @click="onSetTrackPattern(track.key, 'four')">4</button>
                  <button class="hud-btn-xs" @click="onSetTrackPattern(track.key, 'backbeat')">Bk</button>
                </div>
              </div>

              <transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-[200px]"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 max-h-[200px]"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="expandedTracks[track.key]" class="hud-perc-tuning-panel">
                  <template v-if="track.key === 'kick'">
                    <div v-if="getControl('kickLevel')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Level</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('kickLevel').min"
                        :max="getControl('kickLevel').max"
                        :step="getControl('kickLevel').step"
                        :value="getControl('kickLevel').value"
                        @input="onNumberInput('kickLevel', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('kickLevel')) }}</span>
                    </div>
                    <div v-if="getControl('kickDecayMs')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Decay</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('kickDecayMs').min"
                        :max="getControl('kickDecayMs').max"
                        :step="getControl('kickDecayMs').step"
                        :value="getControl('kickDecayMs').value"
                        @input="onNumberInput('kickDecayMs', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('kickDecayMs')) }}</span>
                    </div>
                    <div v-if="getControl('kickToneHz')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Tone</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('kickToneHz').min"
                        :max="getControl('kickToneHz').max"
                        :step="getControl('kickToneHz').step"
                        :value="getControl('kickToneHz').value"
                        @input="onNumberInput('kickToneHz', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('kickToneHz')) }}</span>
                    </div>
                  </template>
                  <template v-if="track.key === 'snare'">
                    <div v-if="getControl('snareLevel')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Level</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('snareLevel').min"
                        :max="getControl('snareLevel').max"
                        :step="getControl('snareLevel').step"
                        :value="getControl('snareLevel').value"
                        @input="onNumberInput('snareLevel', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('snareLevel')) }}</span>
                    </div>
                    <div v-if="getControl('snareDecayMs')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Decay</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('snareDecayMs').min"
                        :max="getControl('snareDecayMs').max"
                        :step="getControl('snareDecayMs').step"
                        :value="getControl('snareDecayMs').value"
                        @input="onNumberInput('snareDecayMs', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('snareDecayMs')) }}</span>
                    </div>
                    <div v-if="getControl('snareToneHz')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Tone</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('snareToneHz').min"
                        :max="getControl('snareToneHz').max"
                        :step="getControl('snareToneHz').step"
                        :value="getControl('snareToneHz').value"
                        @input="onNumberInput('snareToneHz', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('snareToneHz')) }}</span>
                    </div>
                  </template>
                  <template v-if="track.key === 'hihatClosed'">
                    <div v-if="getControl('hihatClosedLevel')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Level</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('hihatClosedLevel').min"
                        :max="getControl('hihatClosedLevel').max"
                        :step="getControl('hihatClosedLevel').step"
                        :value="getControl('hihatClosedLevel').value"
                        @input="onNumberInput('hihatClosedLevel', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('hihatClosedLevel')) }}</span>
                    </div>
                    <div v-if="getControl('hihatClosedDecayMs')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Decay</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('hihatClosedDecayMs').min"
                        :max="getControl('hihatClosedDecayMs').max"
                        :step="getControl('hihatClosedDecayMs').step"
                        :value="getControl('hihatClosedDecayMs').value"
                        @input="onNumberInput('hihatClosedDecayMs', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('hihatClosedDecayMs')) }}</span>
                    </div>
                    <div v-if="getControl('hihatToneHz')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Tone</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('hihatToneHz').min"
                        :max="getControl('hihatToneHz').max"
                        :step="getControl('hihatToneHz').step"
                        :value="getControl('hihatToneHz').value"
                        @input="onNumberInput('hihatToneHz', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('hihatToneHz')) }}</span>
                    </div>
                  </template>
                  <template v-if="track.key === 'hihatOpen'">
                    <div v-if="getControl('hihatOpenLevel')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Level</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('hihatOpenLevel').min"
                        :max="getControl('hihatOpenLevel').max"
                        :step="getControl('hihatOpenLevel').step"
                        :value="getControl('hihatOpenLevel').value"
                        @input="onNumberInput('hihatOpenLevel', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('hihatOpenLevel')) }}</span>
                    </div>
                    <div v-if="getControl('hihatOpenDecayMs')" class="hud-perc-control">
                      <label class="hud-perc-control-label">Decay</label>
                      <input
                        class="hud-slider"
                        type="range"
                        :min="getControl('hihatOpenDecayMs').min"
                        :max="getControl('hihatOpenDecayMs').max"
                        :step="getControl('hihatOpenDecayMs').step"
                        :value="getControl('hihatOpenDecayMs').value"
                        @input="onNumberInput('hihatOpenDecayMs', Number($event.target.value))"
                      />
                      <span class="hud-perc-control-value">{{ formatControlDisplay(getControl('hihatOpenDecayMs')) }}</span>
                    </div>
                  </template>
                </div>
              </transition>

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
