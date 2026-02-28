import { GESTURE_THRESHOLDS } from './constants.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createGestureStateMachine(config = {}) {
  const thresholds = {
    ...GESTURE_THRESHOLDS,
    ...config,
  };

  const state = {
    lastTs: null,
    swipeCooldownUntil: 0,
    transportCooldownUntil: 0,
    adjustPose: null,
    adjustPoseSince: 0,
    twoHandsCandidate: null,
    twoHandsCandidateSince: 0,
    twoHandsStable: null,
    twoHandsStableSince: 0,
  };

  function reset() {
    state.lastTs = null;
    state.swipeCooldownUntil = 0;
    state.transportCooldownUntil = 0;
    state.adjustPose = null;
    state.adjustPoseSince = 0;
    state.twoHandsCandidate = null;
    state.twoHandsCandidateSince = 0;
    state.twoHandsStable = null;
    state.twoHandsStableSince = 0;
  }

  function classifyTwoHandsPose(hands) {
    if (!Array.isArray(hands) || hands.length !== 2) return null;
    const [a, b] = hands;
    if (a.pose === 'open_palm' && b.pose === 'open_palm') return 'open';
    if (a.pose === 'fist' && b.pose === 'fist') return 'fist';
    return null;
  }

  function update(frame) {
    const ts = Number(frame?.timestampMs) || performance.now();
    const previousTs = state.lastTs ?? ts;
    const dtSec = Math.max(0.001, (ts - previousTs) / 1000);
    state.lastTs = ts;

    const rawHands = Array.isArray(frame?.hands) ? frame.hands : [];
    const hands = rawHands.filter((hand) => hand.confidence >= thresholds.minHandsConfidence);

    const events = [];
    let activeGesture = 'idle';
    let confidence = 0;

    const twoHandsPose = classifyTwoHandsPose(hands);
    if (twoHandsPose) {
      if (state.twoHandsCandidate !== twoHandsPose) {
        state.twoHandsCandidate = twoHandsPose;
        state.twoHandsCandidateSince = ts;
      }

      const candidateStableMs = ts - state.twoHandsCandidateSince;
      if (candidateStableMs >= thresholds.twoHandStableMs && state.twoHandsStable !== twoHandsPose) {
        const prevPose = state.twoHandsStable;
        const prevPoseSince = state.twoHandsStableSince;

        state.twoHandsStable = twoHandsPose;
        state.twoHandsStableSince = ts;

        if (
          prevPose &&
          prevPose !== twoHandsPose &&
          ts >= state.transportCooldownUntil &&
          ts - prevPoseSince <= thresholds.transportTransitionMs
        ) {
          if (prevPose === 'open' && twoHandsPose === 'fist') {
            events.push({ type: 'transport_stop' });
            activeGesture = 'transport_stop';
          }
          if (prevPose === 'fist' && twoHandsPose === 'open') {
            events.push({ type: 'transport_start' });
            activeGesture = 'transport_start';
          }

          if (events.length) {
            state.transportCooldownUntil = ts + thresholds.transportCooldownMs;
          }
        }
      }

      state.adjustPose = null;
      confidence = Math.min(...hands.map((hand) => hand.confidence));
      if (!events.length) activeGesture = twoHandsPose === 'open' ? 'two_open' : 'two_fist';
      return { events, activeGesture, confidence, dtSec };
    }

    state.twoHandsCandidate = null;
    state.twoHandsCandidateSince = 0;
    state.twoHandsStable = null;
    state.twoHandsStableSince = 0;

    const hand = hands[0];
    if (!hand) {
      state.adjustPose = null;
      state.adjustPoseSince = 0;
      return { events, activeGesture, confidence, dtSec };
    }

    if (
      hand.pose === 'open_palm' &&
      ts >= state.swipeCooldownUntil &&
      Math.abs(hand.velocity?.x || 0) >= thresholds.swipeVelocityX
    ) {
      const direction = hand.velocity.x > 0 ? 'right' : 'left';
      events.push({
        type: direction === 'right' ? 'focus_next' : 'focus_prev',
        velocityX: hand.velocity.x,
      });
      state.swipeCooldownUntil = ts + thresholds.swipeCooldownMs;
      activeGesture = direction === 'right' ? 'swipe_right' : 'swipe_left';
      confidence = hand.confidence;
    }

    const isAdjustPose = hand.pose === 'index_up' || hand.pose === 'index_down';
    if (!isAdjustPose) {
      state.adjustPose = null;
      state.adjustPoseSince = 0;
      return { events, activeGesture, confidence, dtSec };
    }

    if (state.adjustPose !== hand.pose) {
      state.adjustPose = hand.pose;
      state.adjustPoseSince = ts;
    }

    const holdMs = ts - state.adjustPoseSince;
    if (holdMs >= thresholds.adjustHoldMs) {
      const sign = hand.pose === 'index_up' ? 1 : -1;
      const velocityY = hand.velocity?.y || 0;
      const directionalMotion = sign > 0 ? Math.max(0, -velocityY) : Math.max(0, velocityY);

      events.push({
        type: 'adjust_value',
        sign,
        directionalMotion: clamp(directionalMotion, 0, 4),
        dtSec,
      });

      activeGesture = hand.pose;
      confidence = hand.confidence;
    }

    return { events, activeGesture, confidence, dtSec };
  }

  return {
    update,
    reset,
  };
}
