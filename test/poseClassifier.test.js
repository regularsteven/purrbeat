import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyHandPose } from '../src/gesture/poseClassifier.js';

const createBaseLandmarks = () => Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7, z: 0 }));

function setPoint(landmarks, index, x, y) {
  landmarks[index] = { x, y, z: 0 };
}

function makeOpenPalm() {
  const lm = createBaseLandmarks();
  setPoint(lm, 0, 0.5, 0.88);

  setPoint(lm, 2, 0.4, 0.72);
  setPoint(lm, 3, 0.34, 0.62);
  setPoint(lm, 4, 0.23, 0.52);

  setPoint(lm, 5, 0.43, 0.68);
  setPoint(lm, 6, 0.42, 0.53);
  setPoint(lm, 8, 0.41, 0.34);

  setPoint(lm, 9, 0.5, 0.67);
  setPoint(lm, 10, 0.5, 0.52);
  setPoint(lm, 12, 0.5, 0.32);

  setPoint(lm, 13, 0.57, 0.68);
  setPoint(lm, 14, 0.58, 0.54);
  setPoint(lm, 16, 0.59, 0.36);

  setPoint(lm, 17, 0.64, 0.7);
  setPoint(lm, 18, 0.66, 0.57);
  setPoint(lm, 20, 0.68, 0.42);
  return lm;
}

function makeFist() {
  const lm = createBaseLandmarks();
  setPoint(lm, 0, 0.5, 0.88);

  setPoint(lm, 2, 0.44, 0.76);
  setPoint(lm, 3, 0.45, 0.74);
  setPoint(lm, 4, 0.47, 0.73);

  setPoint(lm, 5, 0.43, 0.68);
  setPoint(lm, 6, 0.43, 0.69);
  setPoint(lm, 8, 0.43, 0.73);

  setPoint(lm, 9, 0.5, 0.68);
  setPoint(lm, 10, 0.5, 0.69);
  setPoint(lm, 12, 0.5, 0.74);

  setPoint(lm, 13, 0.56, 0.69);
  setPoint(lm, 14, 0.56, 0.7);
  setPoint(lm, 16, 0.56, 0.74);

  setPoint(lm, 17, 0.62, 0.7);
  setPoint(lm, 18, 0.62, 0.71);
  setPoint(lm, 20, 0.62, 0.74);
  return lm;
}

function makeIndexUp() {
  const lm = makeFist();
  setPoint(lm, 5, 0.43, 0.68);
  setPoint(lm, 6, 0.43, 0.51);
  setPoint(lm, 8, 0.43, 0.28);
  return lm;
}

function makeIndexDown() {
  const lm = makeFist();
  setPoint(lm, 5, 0.43, 0.62);
  setPoint(lm, 6, 0.43, 0.73);
  setPoint(lm, 8, 0.43, 0.88);
  return lm;
}

test('classifyHandPose detects open palm', () => {
  const result = classifyHandPose(makeOpenPalm());
  assert.equal(result.pose, 'open_palm');
  assert.ok(result.confidence > 0.5);
});

test('classifyHandPose detects fist', () => {
  const result = classifyHandPose(makeFist());
  assert.equal(result.pose, 'fist');
  assert.ok(result.confidence > 0.45);
});

test('classifyHandPose detects index up and index down', () => {
  const up = classifyHandPose(makeIndexUp());
  const down = classifyHandPose(makeIndexDown());
  assert.equal(up.pose, 'index_up');
  assert.equal(down.pose, 'index_down');
});
