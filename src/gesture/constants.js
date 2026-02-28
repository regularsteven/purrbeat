export const GESTURE_THRESHOLDS = Object.freeze({
  minPoseConfidence: 0.58,
  minHandsConfidence: 0.45,
  swipeVelocityX: 0.95,
  swipeCooldownMs: 350,
  adjustHoldMs: 120,
  movementScale: 1.8,
  transportTransitionMs: 900,
  transportCooldownMs: 1200,
  twoHandStableMs: 120,
});

export const GESTURE_LABELS = Object.freeze({
  open_palm: 'Open palm',
  fist: 'Fist',
  index_up: 'Index up',
  index_down: 'Index down',
  unknown: 'Unknown',
});
