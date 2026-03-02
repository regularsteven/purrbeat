import assert from 'node:assert/strict';
import test from 'node:test';

import { createGestureStateMachine } from '../src/gesture/gestureStateMachine.js';

function hand({ pose, confidence = 0.9, vx = 0, vy = 0 }) {
  return {
    pose,
    confidence,
    velocity: { x: vx, y: vy },
  };
}

test('focus swipe uses cooldown', () => {
  const machine = createGestureStateMachine();

  const first = machine.update({
    timestampMs: 1000,
    hands: [hand({ pose: 'open_palm', vx: 1.2 })],
  });
  assert.equal(first.events[0]?.type, 'control_swipe_right');

  const blockedByCooldown = machine.update({
    timestampMs: 1200,
    hands: [hand({ pose: 'open_palm', vx: 1.4 })],
  });
  assert.equal(blockedByCooldown.events.length, 0);

  const afterCooldown = machine.update({
    timestampMs: 1500,
    hands: [hand({ pose: 'open_palm', vx: -1.1 })],
  });
  assert.equal(afterCooldown.events[0]?.type, 'control_swipe_left');
});

test('mirrored preview inverts horizontal swipe interpretation', () => {
  const machine = createGestureStateMachine();

  const unmirrored = machine.update({
    timestampMs: 1000,
    hands: [hand({ pose: 'open_palm', vx: 1.2 })],
    mirrorX: false,
  });
  assert.equal(unmirrored.events[0]?.type, 'control_swipe_right');

  machine.reset();
  const mirrored = machine.update({
    timestampMs: 2000,
    hands: [hand({ pose: 'open_palm', vx: 1.2 })],
    mirrorX: true,
  });
  assert.equal(mirrored.events[0]?.type, 'control_swipe_left');
  assert.equal(mirrored.debug.mirrored, true);
  assert.equal(mirrored.debug.interpretedSwipe, 'control_left');
});

test('index hold emits continuous adjust events after debounce', () => {
  const machine = createGestureStateMachine();

  const beforeHold = machine.update({
    timestampMs: 1000,
    hands: [hand({ pose: 'index_up', vy: -0.3 })],
  });
  assert.equal(beforeHold.events.length, 0);

  const afterHold = machine.update({
    timestampMs: 1150,
    hands: [hand({ pose: 'index_up', vy: -0.6 })],
  });
  assert.equal(afterHold.events[0]?.type, 'adjust_value');
  assert.equal(afterHold.events[0]?.sign, 1);
  assert.ok(afterHold.events[0].directionalMotion > 0);
});

test('two-hand open palms with horizontal velocity emit bank_swipe', () => {
  const machine = createGestureStateMachine();

  const result = machine.update({
    timestampMs: 1000,
    hands: [
      hand({ pose: 'open_palm', vx: 1.2 }),
      hand({ pose: 'open_palm', vx: 1.0 }),
    ],
    mirrorX: false,
  });
  assert.equal(result.events[0]?.type, 'bank_swipe_right');
  assert.equal(result.debug.interpretedSwipe, 'bank_right');
});

test('two-hand open to fist transition triggers transport stop', () => {
  const machine = createGestureStateMachine();

  machine.update({
    timestampMs: 1000,
    hands: [hand({ pose: 'open_palm' }), hand({ pose: 'open_palm' })],
  });

  machine.update({
    timestampMs: 1130,
    hands: [hand({ pose: 'open_palm' }), hand({ pose: 'open_palm' })],
  });

  machine.update({
    timestampMs: 1400,
    hands: [hand({ pose: 'fist' }), hand({ pose: 'fist' })],
  });

  const transition = machine.update({
    timestampMs: 1540,
    hands: [hand({ pose: 'fist' }), hand({ pose: 'fist' })],
  });

  assert.equal(transition.events[0]?.type, 'transport_stop');
});
