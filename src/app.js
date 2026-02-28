import { usePurrEngine } from './composables/usePurrEngine.js';

export const App = {
  setup() {
    const engine = usePurrEngine();
    const configText = Vue.ref(engine.configJson.value);
    Vue.watch(engine.configJson, (v) => { configText.value = v; });

    const pasteApply = () => {
      try {
        engine.applyConfig(configText.value);
      } catch {
        alert('Invalid JSON');
      }
    };

    return { ...engine, configText, pasteApply };
  },
  template: `
  <main class="min-h-screen bg-slate-950 p-6 text-slate-100">
    <div class="mx-auto grid max-w-6xl gap-4">
      <section class="rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-bold">Cat Purr Simulator — Vue Refactor</h1>
            <p class="text-sm text-slate-400">Binaural purr prototype with kick sequencing and JSON preset tools.</p>
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
        <h2 class="mb-2 text-sm font-semibold">Core controls</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <label class="text-xs">BPM {{ Math.round(params.bpm) }}<input v-model.number="params.bpm" @input="applyParams" type="range" min="40" max="220" step="1" class="w-full" /></label>
          <label class="text-xs">Pulse rate {{ params.pulseHz.toFixed(2) }}<input v-model.number="params.pulseHz" :disabled="params.syncToBpm" @input="applyParams" type="range" min="0.2" max="6" step="0.01" class="w-full" /></label>
          <label class="text-xs">Base hz {{ params.baseHz.toFixed(1) }}<input v-model.number="params.baseHz" @input="applyParams" type="range" min="15" max="80" step="0.1" class="w-full" /></label>
          <label class="text-xs">Binaural {{ params.binauralHz.toFixed(2) }}<input v-model.number="params.binauralHz" @input="applyParams" type="range" min="0" max="12" step="0.01" class="w-full" /></label>
          <label class="text-xs">Pulse depth {{ params.pulseDepth.toFixed(2) }}<input v-model.number="params.pulseDepth" @input="applyParams" type="range" min="0" max="1" step="0.01" class="w-full" /></label>
          <label class="text-xs">Noise {{ params.noiseAmt.toFixed(2) }}<input v-model.number="params.noiseAmt" @input="applyParams" type="range" min="0" max="1" step="0.01" class="w-full" /></label>
          <label class="text-xs">Lowpass {{ Math.round(params.lowpassHz) }}<input v-model.number="params.lowpassHz" @input="applyParams" type="range" min="80" max="2000" step="1" class="w-full" /></label>
          <label class="text-xs">Drive {{ params.drive.toFixed(2) }}<input v-model.number="params.drive" @input="applyParams" type="range" min="0" max="1" step="0.01" class="w-full" /></label>
        </div>
        <div class="mt-2 flex items-center gap-3 text-sm">
          <label><input v-model="params.syncToBpm" @change="applyParams" type="checkbox" /> Sync pulse</label>
          <select v-model.number="params.pulseDiv" @change="applyParams" class="rounded bg-black/30 p-1">
            <option :value="0.5">1/2</option><option :value="1">1/4</option><option :value="2">1/8</option><option :value="4">1/16</option>
          </select>
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
        <div class="grid gap-2 md:grid-cols-3 text-xs">
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
