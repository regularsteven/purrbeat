import { GESTURE_THRESHOLDS } from './constants.js';

export function createGestureActions({
  getFocusedControl,
  getControlMeta,
  isControlAdjustable,
  onFocusNext,
  onFocusPrev,
  onAdjust,
  onTransportStart,
  onTransportStop,
  movementScale = GESTURE_THRESHOLDS.movementScale,
}) {
  return {
    apply(events) {
      let latestAdjustVelocity = 0;
      let latestAction = null;

      for (const event of events) {
        if (event.type === 'focus_next') {
          onFocusNext?.();
          latestAction = 'focus_next';
          continue;
        }

        if (event.type === 'focus_prev') {
          onFocusPrev?.();
          latestAction = 'focus_prev';
          continue;
        }

        if (event.type === 'transport_start') {
          onTransportStart?.();
          latestAction = 'transport_start';
          continue;
        }

        if (event.type === 'transport_stop') {
          onTransportStop?.();
          latestAction = 'transport_stop';
          continue;
        }

        if (event.type !== 'adjust_value') continue;

        const focusedKey = getFocusedControl?.();
        if (!focusedKey) continue;
        if (isControlAdjustable && !isControlAdjustable(focusedKey)) continue;

        const controlMeta = getControlMeta?.(focusedKey);
        if (!controlMeta) continue;

        const speedMultiplier = 1 + movementScale * Math.abs(event.directionalMotion || 0);
        const velocity = event.sign * controlMeta.baseGestureRate * speedMultiplier;
        const delta = velocity * (event.dtSec || 0);

        onAdjust?.(focusedKey, delta);

        latestAdjustVelocity = velocity;
        latestAction = `adjust_${event.sign > 0 ? 'up' : 'down'}`;
      }

      return {
        latestAdjustVelocity,
        latestAction,
      };
    },
  };
}
