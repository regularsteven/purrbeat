const MAX_STEPS = 256;

function pattern(len, fn) {
  return Array.from({ length: len }, (_, i) => (fn(i) ? 1 : 0));
}

/** Basic rock: 4/4 kick, backbeat snare, 8ths closed hi-hat, open on 1 & 3 */
export const PRESET_ROCK = {
  kickPattern: pattern(MAX_STEPS, (i) => i % 16 === 0),
  snarePattern: pattern(MAX_STEPS, (i) => i % 16 === 8),
  hihatClosedPattern: pattern(MAX_STEPS, (i) => i % 2 === 0),
  hihatOpenPattern: pattern(MAX_STEPS, (i) => i % 16 === 0 || i % 16 === 8),
};

/** Metal: double kick, snare on 3, 16ths closed hi-hat, open on 1 & 3 */
export const PRESET_METAL = {
  kickPattern: pattern(MAX_STEPS, (i) => i % 8 === 0 || i % 8 === 4),
  snarePattern: pattern(MAX_STEPS, (i) => i % 16 === 12),
  hihatClosedPattern: pattern(MAX_STEPS, (i) => true),
  hihatOpenPattern: pattern(MAX_STEPS, (i) => i % 16 === 0 || i % 16 === 8),
};

/** Syncopated: offbeat kicks, ghost snares, syncopated hi-hat */
export const PRESET_SYNC = {
  kickPattern: pattern(MAX_STEPS, (i) => i % 8 === 2 || i % 8 === 6),
  snarePattern: pattern(MAX_STEPS, (i) => i % 16 === 4 || i % 16 === 8 || i % 16 === 12),
  hihatClosedPattern: pattern(MAX_STEPS, (i) => i % 2 === 0),
  hihatOpenPattern: pattern(MAX_STEPS, (i) => i % 16 === 4),
};

/** Half-time shuffle: slower feel, swung 8ths */
export const PRESET_SHUFFLE = {
  kickPattern: pattern(MAX_STEPS, (i) => i % 16 === 0 || i % 16 === 12),
  snarePattern: pattern(MAX_STEPS, (i) => i % 16 === 8),
  hihatClosedPattern: pattern(MAX_STEPS, (i) => i % 2 === 0),
  hihatOpenPattern: pattern(MAX_STEPS, (i) => i % 16 === 0),
};

export const DRUM_PRESETS = Object.freeze({
  rock: { label: 'Rock', ...PRESET_ROCK },
  metal: { label: 'Metal', ...PRESET_METAL },
  sync: { label: 'Sync', ...PRESET_SYNC },
  shuffle: { label: 'Shuffle', ...PRESET_SHUFFLE },
});
