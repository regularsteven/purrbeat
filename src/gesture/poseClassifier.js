import { clamp01, distance2d } from './landmarkMath.js';

const LANDMARKS = Object.freeze({
  WRIST: 0,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
});

const fingers = [
  ['index', LANDMARKS.INDEX_MCP, LANDMARKS.INDEX_PIP, LANDMARKS.INDEX_TIP],
  ['middle', LANDMARKS.MIDDLE_MCP, LANDMARKS.MIDDLE_PIP, LANDMARKS.MIDDLE_TIP],
  ['ring', LANDMARKS.RING_MCP, LANDMARKS.RING_PIP, LANDMARKS.RING_TIP],
  ['pinky', LANDMARKS.PINKY_MCP, LANDMARKS.PINKY_PIP, LANDMARKS.PINKY_TIP],
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function fingerExtendedUp(landmarks, mcpIdx, pipIdx, tipIdx) {
  const mcp = landmarks[mcpIdx];
  const pip = landmarks[pipIdx];
  const tip = landmarks[tipIdx];
  if (!mcp || !pip || !tip) return false;
  return tip.y < pip.y && pip.y < mcp.y;
}

function fingerExtendedDown(landmarks, mcpIdx, pipIdx, tipIdx) {
  const mcp = landmarks[mcpIdx];
  const pip = landmarks[pipIdx];
  const tip = landmarks[tipIdx];
  if (!mcp || !pip || !tip) return false;
  return tip.y > pip.y && pip.y > mcp.y;
}

function thumbExtended(landmarks) {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const thumbIp = landmarks[LANDMARKS.THUMB_IP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  if (!thumbTip || !thumbIp || !indexMcp) return false;
  return distance2d(thumbTip, indexMcp) > distance2d(thumbIp, indexMcp) * 1.05;
}

function fingerBendScore(landmarks, mcpIdx, pipIdx, tipIdx) {
  const mcp = landmarks[mcpIdx];
  const pip = landmarks[pipIdx];
  const tip = landmarks[tipIdx];
  if (!mcp || !pip || !tip) return 0;
  const spread = Math.abs(tip.y - mcp.y);
  const bend = Math.abs(tip.y - pip.y);
  if (spread < 0.01) return 1;
  return clamp01(1 - bend / (spread + 0.0001));
}

export function getFingerStates(landmarks) {
  const states = {
    thumb: thumbExtended(landmarks),
    indexUp: fingerExtendedUp(landmarks, LANDMARKS.INDEX_MCP, LANDMARKS.INDEX_PIP, LANDMARKS.INDEX_TIP),
    indexDown: fingerExtendedDown(landmarks, LANDMARKS.INDEX_MCP, LANDMARKS.INDEX_PIP, LANDMARKS.INDEX_TIP),
    middleUp: fingerExtendedUp(landmarks, LANDMARKS.MIDDLE_MCP, LANDMARKS.MIDDLE_PIP, LANDMARKS.MIDDLE_TIP),
    ringUp: fingerExtendedUp(landmarks, LANDMARKS.RING_MCP, LANDMARKS.RING_PIP, LANDMARKS.RING_TIP),
    pinkyUp: fingerExtendedUp(landmarks, LANDMARKS.PINKY_MCP, LANDMARKS.PINKY_PIP, LANDMARKS.PINKY_TIP),
  };

  states.extendedCount = [states.thumb, states.indexUp, states.middleUp, states.ringUp, states.pinkyUp].filter(Boolean).length;
  return states;
}

function estimateOpenPalmConfidence(landmarks, states) {
  if (states.extendedCount < 4) return 0;
  const wrist = landmarks[LANDMARKS.WRIST];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  const pinkyTip = landmarks[LANDMARKS.PINKY_TIP];
  if (!wrist || !indexTip || !pinkyTip) return 0.6;

  const palmSpread = distance2d(indexTip, pinkyTip);
  const palmReach = (distance2d(wrist, indexTip) + distance2d(wrist, pinkyTip)) / 2;
  return clamp(0.55 + palmSpread * 0.5 + palmReach * 0.35, 0, 0.99);
}

function estimateFistConfidence(landmarks, states) {
  if (states.extendedCount > 1) return 0;
  const bendScores = fingers.map(([, mcp, pip, tip]) => fingerBendScore(landmarks, mcp, pip, tip));
  const avgBend = bendScores.reduce((sum, score) => sum + score, 0) / bendScores.length;
  return clamp(0.45 + avgBend * 0.6, 0, 0.99);
}

function estimateIndexOnlyConfidence(landmarks, states, direction) {
  const indexCondition = direction === 'up' ? states.indexUp : states.indexDown;
  if (!indexCondition || states.middleUp || states.ringUp || states.pinkyUp) return 0;

  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  if (!indexTip || !indexMcp) return 0.65;

  const extension = Math.abs(indexTip.y - indexMcp.y);
  return clamp(0.5 + extension * 0.8, 0, 0.99);
}

export function classifyHandPose(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) {
    return { pose: 'unknown', confidence: 0 };
  }

  const states = getFingerStates(landmarks);
  const openConfidence = estimateOpenPalmConfidence(landmarks, states);
  const fistConfidence = estimateFistConfidence(landmarks, states);
  const indexUpConfidence = estimateIndexOnlyConfidence(landmarks, states, 'up');
  const indexDownConfidence = estimateIndexOnlyConfidence(landmarks, states, 'down');

  const candidates = [
    { pose: 'open_palm', confidence: openConfidence },
    { pose: 'fist', confidence: fistConfidence },
    { pose: 'index_up', confidence: indexUpConfidence },
    { pose: 'index_down', confidence: indexDownConfidence },
  ].sort((a, b) => b.confidence - a.confidence);

  const winner = candidates[0];
  if (!winner || winner.confidence < 0.42) {
    return { pose: 'unknown', confidence: clamp(winner?.confidence || 0, 0, 0.41), states };
  }

  return {
    pose: winner.pose,
    confidence: winner.confidence,
    states,
  };
}
