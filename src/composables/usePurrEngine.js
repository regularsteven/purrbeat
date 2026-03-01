import { clampCoreControlValue, isCoreControlKey } from '../config/coreControls.js';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SNARE_LEVEL_MAX = 1.5;
const SNARE_LEVEL_DEFAULT = 0.65;
const dbToGain = (db) => Math.pow(10, db / 20);

const DEFAULT = {
  bpm: 90,
  syncToBpm: true,
  pulseDiv: 1,
  baseHz: 28,
  binauralHz: 2.5,
  pulseHz: 2.2,
  pulseDepth: 0.55,
  noiseAmt: 0.22,
  lowpassHz: 420,
  drive: 0.18,
  outDb: -18,
  kickOn: true,
  kickLevel: 0.55,
  kickDecayMs: 180,
  snareOn: true,
  snareLevel: SNARE_LEVEL_DEFAULT,
  snareToneHz: 1900,
  snareDecayMs: 120,
  swing: 0.12,
  loopBars: 2,
  segmentsPerBar: 16,
  kickPattern: Array.from({ length: 256 }, (_, i) => (i % 32 === 0 ? 1 : 0)),
  snarePattern: Array.from({ length: 256 }, (_, i) => (i % 32 === 16 ? 1 : 0)),
};

const PROFILES = {
  soft: {
    bpm: 78, syncToBpm: true, pulseDiv: 1,
    baseHz: 24, binauralHz: 1.8, pulseDepth: 0.45, noiseAmt: 0.18, lowpassHz: 320, drive: 0.12, outDb: -20,
    kickOn: true, kickLevel: 0.45, kickDecayMs: 170,
    snareOn: true, snareLevel: 0.45, snareToneHz: 1700, snareDecayMs: 140,
    swing: 0.10, loopBars: 2, segmentsPerBar: 16,
    kickPattern: Array.from({ length: 256 }, (_, i) => (i % 32 === 0 ? 1 : 0)),
    snarePattern: Array.from({ length: 256 }, (_, i) => (i % 32 === 16 ? 1 : 0)),
  },
  sleepy: {
    bpm: 64, syncToBpm: true, pulseDiv: 0.5,
    baseHz: 20, binauralHz: 0.9, pulseDepth: 0.35, noiseAmt: 0.15, lowpassHz: 260, drive: 0.10, outDb: -22,
    kickOn: false, kickLevel: 0, kickDecayMs: 200,
    snareOn: false, snareLevel: 0, snareToneHz: 1400, snareDecayMs: 160,
    swing: 0, loopBars: 2, segmentsPerBar: 16,
    kickPattern: Array.from({ length: 256 }, () => 0),
    snarePattern: Array.from({ length: 256 }, () => 0),
  },
  motor: {
    bpm: 112, syncToBpm: true, pulseDiv: 2,
    baseHz: 48, binauralHz: 4.2, pulseDepth: 0.75, noiseAmt: 0.10, lowpassHz: 520, drive: 0.22, outDb: -20,
    kickOn: true, kickLevel: 0.70, kickDecayMs: 140,
    snareOn: true, snareLevel: 0.7, snareToneHz: 2200, snareDecayMs: 100,
    swing: 0.06, loopBars: 2, segmentsPerBar: 16,
    kickPattern: Array.from({ length: 256 }, (_, i) => (i % 16 === 0 ? 1 : 0)),
    snarePattern: Array.from({ length: 256 }, (_, i) => (i % 16 === 8 ? 1 : 0)),
  },
  therapy: {
    bpm: 96, syncToBpm: true, pulseDiv: 1,
    baseHz: 30, binauralHz: 3.8, pulseDepth: 0.55, noiseAmt: 0.20, lowpassHz: 420, drive: 0.16, outDb: -19,
    kickOn: true, kickLevel: 0.55, kickDecayMs: 180,
    snareOn: true, snareLevel: 0.65, snareToneHz: 1850, snareDecayMs: 120,
    swing: 0.14, loopBars: 2, segmentsPerBar: 16,
    kickPattern: Array.from({ length: 256 }, (_, i) => (i % 32 === 0 || i % 32 === 24 ? 1 : 0)),
    snarePattern: Array.from({ length: 256 }, (_, i) => (i % 32 === 16 ? 1 : 0)),
  },
};

const MAX_STEPS = 256;

const PERCUSSION_TRACKS = Object.freeze([
  Object.freeze({ key: 'kick', label: 'Kick', enabledParam: 'kickOn', patternParam: 'kickPattern' }),
  Object.freeze({ key: 'snare', label: 'Snare', enabledParam: 'snareOn', patternParam: 'snarePattern' }),
]);

export function usePurrEngine() {
  const scopeCanvas = Vue.ref(null);
  const running = Vue.ref(false);
  const params = Vue.reactive({ ...DEFAULT, kickPattern: [...DEFAULT.kickPattern], snarePattern: [...DEFAULT.snarePattern] });
  const stepIndex = Vue.ref(0);

  let ctx = null;
  let oscL, oscR, gainL, gainR, pulseOsc, pulseGain, noiseSource, noiseGain, noiseFilter, mixGain, lpFilter, shaper, outGain, analyser, drumBus;
  let raf = null;
  let seqTimer = null;
  let nextStepTime = 0;

  const lookaheadMs = 25;
  const scheduleAheadTime = 0.15;

  const leftHz = Vue.computed(() => Math.max(0.01, params.baseHz - params.binauralHz / 2));
  const rightHz = Vue.computed(() => Math.max(0.01, params.baseHz + params.binauralHz / 2));
  const totalSteps = Vue.computed(() => clamp(Math.round(params.loopBars * params.segmentsPerBar), 1, MAX_STEPS));
  const seqPos = Vue.computed(() => {
    const segments = clamp(Number(params.segmentsPerBar) || 16, 1, 32);
    return `bar ${Math.floor(stepIndex.value / segments) + 1} • step ${(stepIndex.value % segments) + 1}`;
  });
  const configJson = Vue.computed(() => JSON.stringify(params, null, 2));
  const percussionTracks = Vue.computed(() => PERCUSSION_TRACKS.map((track) => ({
    key: track.key,
    label: track.label,
    enabled: Boolean(params[track.enabledParam]),
    pattern: (params[track.patternParam] || []).slice(0, totalSteps.value),
  })));

  function inferFromBpm() {
    if (params.syncToBpm) params.pulseHz = (params.bpm / 60) * parseFloat(params.pulseDiv || 1);
  }

  function makeSoftClipCurve(amount) {
    const k = 1 + amount * 40;
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.atan(k * x) / Math.atan(k);
    }
    return curve;
  }

  function createNoiseBuffer(context, seconds = 2) {
    const len = Math.floor(context.sampleRate * seconds);
    const buf = context.createBuffer(1, len, context.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      last = clamp(last + 0.02 * white, -1, 1);
      data[i] = last;
    }
    return buf;
  }

  function applyParams() {
    inferFromBpm();
    if (!ctx) return;

    oscL?.frequency.setTargetAtTime(leftHz.value, ctx.currentTime, 0.02);
    oscR?.frequency.setTargetAtTime(rightHz.value, ctx.currentTime, 0.02);
    pulseOsc?.frequency.setTargetAtTime(params.pulseHz, ctx.currentTime, 0.02);

    const floor = 1 - clamp(params.pulseDepth, 0, 1);
    const depth = clamp(params.pulseDepth, 0, 1);
    const lfoAmp = depth / 2;
    const offset = floor + depth / 2;
    pulseGain?.gain.setTargetAtTime(lfoAmp, ctx.currentTime, 0.02);
    gainL?.gain.setTargetAtTime(offset, ctx.currentTime, 0.02);
    gainR?.gain.setTargetAtTime(offset, ctx.currentTime, 0.02);

    noiseGain?.gain.setTargetAtTime(clamp(params.noiseAmt, 0, 1) * 0.35, ctx.currentTime, 0.04);
    lpFilter?.frequency.setTargetAtTime(clamp(params.lowpassHz, 80, 2000), ctx.currentTime, 0.03);
    if (shaper) shaper.curve = makeSoftClipCurve(clamp(params.drive, 0, 1));
    outGain?.gain.setTargetAtTime(dbToGain(params.outDb), ctx.currentTime, 0.04);
  }

  function setCoreParam(key, value) {
    if (!isCoreControlKey(key)) return;
    params[key] = clampCoreControlValue(key, value);
    applyParams();
  }

  function nudgeCoreParam(key, delta) {
    if (!isCoreControlKey(key)) return;
    setCoreParam(key, Number(params[key]) + Number(delta));
  }

  function sixteenthDur() {
    const stepsPerBeat = clamp(Number(params.segmentsPerBar) || 16, 4, 32) / 4;
    return 60 / clamp(params.bpm, 30, 260) / stepsPerBeat;
  }

  function triggerKick(time) {
    if (!ctx || !drumBus || !params.kickOn) return;
    const decay = clamp(params.kickDecayMs, 40, 600) / 1000;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const sat = ctx.createWaveShaper();
    const lp = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + decay);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, clamp(params.kickLevel, 0, 1)), time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    sat.curve = makeSoftClipCurve(0.25);
    sat.oversample = '2x';
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(520, time);
    lp.Q.setValueAtTime(0.7, time);

    osc.connect(g);
    g.connect(lp);
    lp.connect(sat);
    sat.connect(drumBus);

    osc.start(time);
    osc.stop(time + decay + 0.05);
  }

  function scheduleStep(idx, time) {
    if (params.kickPattern[idx]) {
      const swingDelay = idx % 2 === 1 ? sixteenthDur() * clamp(params.swing, 0, 0.6) * 0.5 : 0;
      triggerKick(time + swingDelay);
    }
    if (params.snarePattern[idx]) {
      triggerSnare(time);
    }
  }

  function triggerSnare(time) {
    if (!ctx || !drumBus || !params.snareOn) return;
    const decay = clamp(params.snareDecayMs, 40, 600) / 1000;

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.5);
    const noiseFilterNode = ctx.createBiquadFilter();
    noiseFilterNode.type = 'bandpass';
    noiseFilterNode.frequency.setValueAtTime(clamp(params.snareToneHz, 600, 6000), time);
    noiseFilterNode.Q.setValueAtTime(1, time);
    const noiseGainNode = ctx.createGain();

    noiseGainNode.gain.setValueAtTime(0.0001, time);
    const snareLevel = clamp(params.snareLevel, 0, SNARE_LEVEL_MAX);
    noiseGainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, snareLevel), time + 0.002);
    noiseGainNode.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    noise.connect(noiseFilterNode);
    noiseFilterNode.connect(noiseGainNode);
    noiseGainNode.connect(drumBus);
    noise.start(time);
    noise.stop(time + decay + 0.03);
  }

  function scheduler() {
    if (!ctx) return;
    while (nextStepTime < ctx.currentTime + scheduleAheadTime) {
      scheduleStep(stepIndex.value, nextStepTime);
      nextStepTime += sixteenthDur();
      stepIndex.value = (stepIndex.value + 1) % totalSteps.value;
    }
  }

  function startSequencer() {
    if (seqTimer || !ctx) return;
    stepIndex.value = 0;
    nextStepTime = ctx.currentTime + 0.06;
    seqTimer = setInterval(scheduler, lookaheadMs);
  }

  function stopSequencer() {
    if (seqTimer) clearInterval(seqTimer);
    seqTimer = null;
  }

  function startScope() {
    const canvas = scopeCanvas.value;
    if (!canvas || !analyser) return;
    const g = canvas.getContext('2d');
    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      if (!ctx || !analyser) return;
      analyser.getByteTimeDomainData(data);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.strokeStyle = 'rgba(122,162,255,0.85)';
      g.lineWidth = 2;
      g.beginPath();
      const slice = canvas.width / data.length;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        const x = i * slice;
        const y = canvas.height / 2 + v * (canvas.height * 0.36);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
  }

  function stopScope() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    const canvas = scopeCanvas.value;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function buildGraph() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    oscL = ctx.createOscillator(); oscR = ctx.createOscillator(); pulseOsc = ctx.createOscillator();
    oscL.type = 'sine'; oscR.type = 'sine'; pulseOsc.type = 'sine';
    gainL = ctx.createGain(); gainR = ctx.createGain(); pulseGain = ctx.createGain();
    noiseSource = ctx.createBufferSource(); noiseSource.buffer = createNoiseBuffer(ctx, 2); noiseSource.loop = true;
    noiseGain = ctx.createGain(); noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'lowpass';
    mixGain = ctx.createGain(); lpFilter = ctx.createBiquadFilter(); lpFilter.type = 'lowpass';
    shaper = ctx.createWaveShaper(); shaper.oversample = '2x';
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
    outGain = ctx.createGain(); drumBus = ctx.createGain();

    oscL.connect(gainL); oscR.connect(gainR);
    pulseOsc.connect(pulseGain); pulseGain.connect(gainL.gain); pulseGain.connect(gainR.gain);
    gainL.connect(mixGain); gainR.connect(mixGain);
    noiseSource.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(mixGain);
    mixGain.connect(lpFilter); lpFilter.connect(shaper); shaper.connect(analyser); shaper.connect(outGain);
    drumBus.connect(outGain); outGain.connect(ctx.destination);

    oscL.start(); oscR.start(); pulseOsc.start(); noiseSource.start();
    applyParams();
    startScope();
    startSequencer();
  }

  async function start() {
    if (running.value) return;
    if (!ctx) buildGraph();
    if (ctx && ctx.state !== 'running') await ctx.resume();
    running.value = true;
    applyParams();
  }

  function stop() {
    stopScope();
    stopSequencer();
    if (ctx) {
      [oscL, oscR, pulseOsc, noiseSource].forEach((n) => { if (n?.stop) n.stop(); });
      ctx.close();
    }
    ctx = null;
    running.value = false;
  }

  function applyProfile(name) {
    const profile = PROFILES[name];
    if (!profile) return;
    Object.assign(params, profile, { kickPattern: [...profile.kickPattern], snarePattern: [...profile.snarePattern] });
    applyParams();
  }

  function randomize() {
    const r = (a, b) => a + Math.random() * (b - a);
    params.bpm = Math.round(r(55, 140));
    params.syncToBpm = true;
    params.pulseDiv = [0.5, 1, 2, 4][Math.floor(Math.random() * 4)];
    params.baseHz = r(18, 55);
    params.binauralHz = r(0, 6);
    params.pulseDepth = r(0.2, 0.85);
    params.noiseAmt = r(0, 0.45);
    params.lowpassHz = r(180, 900);
    params.drive = r(0, 0.35);
    params.outDb = r(-28, -14);
    params.kickOn = Math.random() > 0.2;
    params.snareOn = Math.random() > 0.25;
    params.kickLevel = r(0.3, 0.8);
    params.kickDecayMs = Math.round(r(90, 260));
    params.snareLevel = r(0.3, Math.min(SNARE_LEVEL_MAX, 1.2));
    params.snareToneHz = Math.round(r(1000, 3200));
    params.snareDecayMs = Math.round(r(70, 220));
    params.swing = r(0, 0.2);
    params.loopBars = [1, 2, 4][Math.floor(Math.random() * 3)];
    params.segmentsPerBar = [8, 16, 32][Math.floor(Math.random() * 3)];
    params.kickPattern = Array.from({ length: MAX_STEPS }, (_, i) => (i % 16 === 0 ? 1 : (Math.random() < 0.08 ? 1 : 0)));
    params.snarePattern = Array.from({ length: MAX_STEPS }, (_, i) => (i % 16 === 8 ? 1 : (Math.random() < 0.04 ? 1 : 0)));
    applyParams();
  }

  function toggleStep(i) {
    toggleTrackStep('kick', i);
  }

  function setPattern(mode) {
    setTrackPattern('kick', mode);
  }

  function toggleTrackEnabled(trackKey) {
    const track = PERCUSSION_TRACKS.find((item) => item.key === trackKey);
    if (!track) return;
    params[track.enabledParam] = !params[track.enabledParam];
  }

  function toggleTrackStep(trackKey, i) {
    const track = PERCUSSION_TRACKS.find((item) => item.key === trackKey);
    if (!track || i < 0 || i >= MAX_STEPS) return;
    const pattern = params[track.patternParam];
    pattern[i] = pattern[i] ? 0 : 1;
  }

  function setTrackPattern(trackKey, mode) {
    const track = PERCUSSION_TRACKS.find((item) => item.key === trackKey);
    if (!track) return;
    params[track.patternParam] = Array.from({ length: MAX_STEPS }, (_, i) => {
      if (mode === 'clear') return 0;
      if (mode === 'simple') return trackKey === 'snare' ? (i % 16 === 8 ? 1 : 0) : (i === 0 ? 1 : 0);
      if (mode === 'four') return trackKey === 'snare' ? (i % 16 === 8 ? 1 : 0) : (i % 16 === 0 ? 1 : 0);
      if (mode === 'backbeat') return trackKey === 'snare' ? (i % 16 === 4 || i % 16 === 12 ? 1 : 0) : (i % 16 === 0 ? 1 : 0);
      const chance = trackKey === 'snare' ? 0.09 : 0.12;
      return i % 16 === (trackKey === 'snare' ? 8 : 0) || Math.random() < chance ? 1 : 0;
    });
  }

  function reset() {
    Object.assign(params, { ...DEFAULT, kickPattern: [...DEFAULT.kickPattern], snarePattern: [...DEFAULT.snarePattern] });
    applyParams();
  }

  async function copyConfig() {
    await navigator.clipboard.writeText(configJson.value);
  }

  function applyConfig(text) {
    const obj = JSON.parse(text);
    Object.assign(params, obj);
    params.loopBars = clamp(Number(obj.loopBars) || params.loopBars, 1, 8);
    params.segmentsPerBar = [8, 16, 32].includes(Number(obj.segmentsPerBar)) ? Number(obj.segmentsPerBar) : params.segmentsPerBar;
    params.kickPattern = Array.from({ length: MAX_STEPS }, (_, i) => (obj.kickPattern?.[i] ? 1 : 0));
    params.snarePattern = Array.from({ length: MAX_STEPS }, (_, i) => (obj.snarePattern?.[i] ? 1 : 0));
    applyParams();
  }

  return {
    params,
    running,
    stepIndex,
    scopeCanvas,
    leftHz,
    rightHz,
    seqPos,
    configJson,
    percussionTracks,
    totalSteps,
    audioState: Vue.computed(() => (ctx ? ctx.state : 'n/a')),
    sampleRate: Vue.computed(() => (ctx ? `${ctx.sampleRate} Hz` : 'n/a')),
    start,
    stop,
    applyParams,
    applyProfile,
    randomize,
    setCoreParam,
    nudgeCoreParam,
    toggleStep,
    setPattern,
    toggleTrackEnabled,
    toggleTrackStep,
    setTrackPattern,
    reset,
    copyConfig,
    applyConfig,
  };
}
