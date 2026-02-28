import assert from 'node:assert/strict';
import test from 'node:test';

import { clampCoreControlValue, getCoreControlByKey, isCoreControlKey } from '../src/config/coreControls.js';

test('core control keys are registered', () => {
  assert.equal(isCoreControlKey('bpm'), true);
  assert.equal(isCoreControlKey('drive'), true);
  assert.equal(isCoreControlKey('unknown_key'), false);
  assert.equal(getCoreControlByKey('lowpassHz')?.min, 80);
});

test('clampCoreControlValue clamps values inside configured ranges', () => {
  assert.equal(clampCoreControlValue('bpm', 999), 220);
  assert.equal(clampCoreControlValue('bpm', -20), 40);
  assert.equal(clampCoreControlValue('drive', -1), 0);
  assert.equal(clampCoreControlValue('drive', 5), 1);
  assert.equal(clampCoreControlValue('lowpassHz', 420), 420);
});

test('clampCoreControlValue snaps to step', () => {
  assert.equal(clampCoreControlValue('bpm', 99.49), 99);
  assert.equal(clampCoreControlValue('bpm', 99.51), 100);
  assert.equal(clampCoreControlValue('pulseDepth', 0.553), 0.55);
});
