import { CORE_CONTROLS } from './coreControls.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const snapToStep = (value, min, step) => {
  if (!step || step <= 0) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(snapped.toFixed(6));
};

const coreMap = new Map(CORE_CONTROLS.map((control) => [control.key, control]));

function controlFromCore(key, extras = {}) {
  const core = coreMap.get(key);
  if (!core) throw new Error(`Unknown core control: ${key}`);
  return {
    key,
    type: 'number',
    label: core.label,
    min: core.min,
    max: core.max,
    step: core.step,
    baseGestureRate: core.baseGestureRate,
    unit: extras.unit || '',
    format: core.format,
    gestureAdjustable: true,
    ...extras,
  };
}

const CONTROL_DEFS = [
  controlFromCore('bpm', { label: 'BPM', unit: 'bpm' }),
  {
    key: 'syncToBpm',
    type: 'toggle',
    label: 'Sync pulse',
    baseGestureRate: 1,
    gestureAdjustable: true,
    format: (value) => (value ? 'On' : 'Off'),
  },
  {
    key: 'pulseDiv',
    type: 'enum',
    label: 'Pulse division',
    baseGestureRate: 1,
    gestureAdjustable: true,
    options: [0.5, 1, 2, 4],
    optionLabels: {
      0.5: '1/2',
      1: '1/4',
      2: '1/8',
      4: '1/16',
    },
    format: (value, control) => control.optionLabels?.[value] || String(value),
  },

  controlFromCore('baseHz', { label: 'Base Hz', unit: 'Hz' }),
  controlFromCore('binauralHz', { label: 'Binaural', unit: 'Hz' }),
  controlFromCore('pulseDepth', { label: 'Pulse depth' }),
  controlFromCore('pulseHz', { label: 'Pulse rate', unit: 'Hz' }),
  controlFromCore('noiseAmt', { label: 'Texture' }),
  controlFromCore('lowpassHz', { label: 'Lowpass', unit: 'Hz' }),
  controlFromCore('drive', { label: 'Drive' }),
  {
    key: 'outDb',
    type: 'number',
    label: 'Output',
    min: -30,
    max: -8,
    step: 0.5,
    baseGestureRate: 3.5,
    unit: 'dB',
    gestureAdjustable: true,
    format: (value) => `${Number(value).toFixed(1)} dB`,
  },

  {
    key: 'kickOn',
    type: 'toggle',
    label: 'Kick enabled',
    baseGestureRate: 1,
    gestureAdjustable: true,
    format: (value) => (value ? 'On' : 'Off'),
  },
  {
    key: 'kickLevel',
    type: 'number',
    label: 'Kick level',
    min: 0,
    max: 1,
    step: 0.01,
    baseGestureRate: 0.24,
    gestureAdjustable: true,
    format: (value) => Number(value).toFixed(2),
  },
  {
    key: 'kickDecayMs',
    type: 'number',
    label: 'Kick decay',
    min: 40,
    max: 600,
    step: 1,
    baseGestureRate: 70,
    unit: 'ms',
    gestureAdjustable: true,
    format: (value) => `${Math.round(value)} ms`,
  },
  {
    key: 'swing',
    type: 'number',
    label: 'Swing',
    min: 0,
    max: 0.6,
    step: 0.01,
    baseGestureRate: 0.16,
    gestureAdjustable: true,
    format: (value) => Number(value).toFixed(2),
  },
  {
    key: 'loopBars',
    type: 'enum',
    label: 'Bars',
    baseGestureRate: 1,
    gestureAdjustable: true,
    options: [1, 2, 4, 8],
    format: (value) => `${value} bars`,
  },
  {
    key: 'segmentsPerBar',
    type: 'enum',
    label: 'Segments',
    baseGestureRate: 1,
    gestureAdjustable: true,
    options: [8, 16, 32],
    optionLabels: {
      8: '8',
      16: '16',
      32: '32',
    },
    format: (value) => `${value} steps`,
  },
  {
    key: 'snareOn',
    type: 'toggle',
    label: 'Snare enabled',
    baseGestureRate: 1,
    gestureAdjustable: true,
    format: (value) => (value ? 'On' : 'Off'),
  },
  {
    key: 'snareLevel',
    type: 'number',
    label: 'Snare level',
    min: 0,
    max: 1.5,
    step: 0.01,
    baseGestureRate: 0.24,
    gestureAdjustable: true,
    format: (value) => Number(value).toFixed(2),
  },
  {
    key: 'snareToneHz',
    type: 'number',
    label: 'Snare tone',
    min: 600,
    max: 6000,
    step: 25,
    baseGestureRate: 220,
    unit: 'Hz',
    gestureAdjustable: true,
    format: (value) => `${Math.round(value)} Hz`,
  },
  {
    key: 'snareDecayMs',
    type: 'number',
    label: 'Snare decay',
    min: 40,
    max: 600,
    step: 1,
    baseGestureRate: 70,
    unit: 'ms',
    gestureAdjustable: true,
    format: (value) => `${Math.round(value)} ms`,
  },
];

export const CONTROL_BANKS = Object.freeze([
  Object.freeze({
    key: 'purr',
    label: 'Per',
    controls: Object.freeze(['baseHz', 'binauralHz', 'pulseDepth', 'pulseHz', 'noiseAmt', 'lowpassHz', 'drive', 'outDb']),
  }),
  Object.freeze({
    key: 'kick',
    label: 'Percussion',
    controls: Object.freeze(['kickOn', 'kickLevel', 'kickDecayMs', 'snareOn', 'snareLevel', 'snareToneHz', 'snareDecayMs', 'swing', 'loopBars', 'segmentsPerBar']),
  }),
  Object.freeze({
    key: 'transport',
    label: 'General',
    controls: Object.freeze(['bpm', 'syncToBpm', 'pulseDiv']),
  }),
]);

export const CONTROL_CATALOG = Object.freeze(CONTROL_DEFS.map((control) => Object.freeze({ ...control })));

const CONTROL_MAP = new Map(CONTROL_CATALOG.map((control) => [control.key, control]));

export function getControlByKey(key) {
  return CONTROL_MAP.get(key) || null;
}

export function formatControlValue(control, value) {
  if (!control) return String(value);
  if (typeof control.format === 'function') return control.format(value, control);
  if (control.type === 'toggle') return value ? 'On' : 'Off';
  if (control.unit) return `${value} ${control.unit}`;
  return String(value);
}

export function clampControlValue(control, rawValue) {
  if (!control || control.type !== 'number') return rawValue;
  const numeric = Number(rawValue);
  const base = Number.isFinite(numeric) ? numeric : control.min;
  const snapped = snapToStep(base, control.min, control.step);
  return clamp(snapped, control.min, control.max);
}

export function getEnumStepValue(control, currentValue, sign) {
  if (!control || control.type !== 'enum' || !Array.isArray(control.options) || !control.options.length) {
    return currentValue;
  }

  const options = control.options;
  const currentIndex = options.indexOf(currentValue);
  const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = clamp(fallbackIndex + (sign >= 0 ? 1 : -1), 0, options.length - 1);
  return options[nextIndex];
}

export function getBankByIndex(index) {
  const size = CONTROL_BANKS.length;
  if (!size) return null;
  const normalized = ((index % size) + size) % size;
  return CONTROL_BANKS[normalized];
}
