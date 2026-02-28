const CONTROL_DEFS = [
  {
    key: 'bpm',
    label: 'BPM',
    min: 40,
    max: 220,
    step: 1,
    baseGestureRate: 18,
    format: (value) => `${Math.round(value)}`,
  },
  {
    key: 'pulseHz',
    label: 'Pulse rate',
    min: 0.2,
    max: 6,
    step: 0.01,
    baseGestureRate: 0.55,
    format: (value) => Number(value).toFixed(2),
  },
  {
    key: 'baseHz',
    label: 'Base hz',
    min: 15,
    max: 80,
    step: 0.1,
    baseGestureRate: 4.8,
    format: (value) => Number(value).toFixed(1),
  },
  {
    key: 'binauralHz',
    label: 'Binaural',
    min: 0,
    max: 12,
    step: 0.01,
    baseGestureRate: 0.9,
    format: (value) => Number(value).toFixed(2),
  },
  {
    key: 'pulseDepth',
    label: 'Pulse depth',
    min: 0,
    max: 1,
    step: 0.01,
    baseGestureRate: 0.2,
    format: (value) => Number(value).toFixed(2),
  },
  {
    key: 'noiseAmt',
    label: 'Noise',
    min: 0,
    max: 1,
    step: 0.01,
    baseGestureRate: 0.2,
    format: (value) => Number(value).toFixed(2),
  },
  {
    key: 'lowpassHz',
    label: 'Lowpass',
    min: 80,
    max: 2000,
    step: 1,
    baseGestureRate: 220,
    format: (value) => `${Math.round(value)}`,
  },
  {
    key: 'drive',
    label: 'Drive',
    min: 0,
    max: 1,
    step: 0.01,
    baseGestureRate: 0.22,
    format: (value) => Number(value).toFixed(2),
  },
];

export const CORE_CONTROLS = Object.freeze(CONTROL_DEFS.map((control) => Object.freeze({ ...control })));

const CONTROL_MAP = new Map(CORE_CONTROLS.map((control) => [control.key, control]));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const snapToStep = (value, min, step) => {
  if (!step || step <= 0) return value;
  return Math.round((value - min) / step) * step + min;
};

export function getCoreControlByKey(key) {
  return CONTROL_MAP.get(key) || null;
}

export function isCoreControlKey(key) {
  return CONTROL_MAP.has(key);
}

export function clampCoreControlValue(key, rawValue) {
  const control = getCoreControlByKey(key);
  if (!control) return rawValue;

  const numeric = Number(rawValue);
  const fallback = Number.isFinite(numeric) ? numeric : control.min;
  const snapped = snapToStep(fallback, control.min, control.step);
  return clamp(snapped, control.min, control.max);
}

export function formatCoreControlValue(key, value) {
  const control = getCoreControlByKey(key);
  if (!control) return `${value}`;
  return control.format(value);
}
