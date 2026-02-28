import { boundingBox } from './landmarkMath.js';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

function ensureCanvasSize(canvas, width, height) {
  if (!canvas || !width || !height) return;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

export function drawGestureOverlay({ canvas, video, hands, hud }) {
  if (!canvas) return;

  const drawWidth = video?.videoWidth || canvas.clientWidth || 960;
  const drawHeight = video?.videoHeight || canvas.clientHeight || 540;
  ensureCanvasSize(canvas, drawWidth, drawHeight);

  const g = canvas.getContext('2d');
  if (!g) return;

  g.clearRect(0, 0, canvas.width, canvas.height);

  for (const hand of hands || []) {
    const lm = hand.landmarks || [];

    g.strokeStyle = 'rgba(110, 231, 183, 0.9)';
    g.lineWidth = 2;
    g.beginPath();
    for (const [aIdx, bIdx] of HAND_CONNECTIONS) {
      const a = lm[aIdx];
      const b = lm[bIdx];
      if (!a || !b) continue;
      g.moveTo(a.x * canvas.width, a.y * canvas.height);
      g.lineTo(b.x * canvas.width, b.y * canvas.height);
    }
    g.stroke();

    g.fillStyle = 'rgba(59, 130, 246, 0.95)';
    for (const point of lm) {
      g.beginPath();
      g.arc(point.x * canvas.width, point.y * canvas.height, 2.6, 0, Math.PI * 2);
      g.fill();
    }

    const box = boundingBox(lm);
    const x = box.minX * canvas.width;
    const y = box.minY * canvas.height;
    const w = box.width * canvas.width;
    const h = box.height * canvas.height;

    g.strokeStyle = 'rgba(250, 204, 21, 0.9)';
    g.lineWidth = 1.5;
    g.strokeRect(x, y, w, h);

    g.fillStyle = 'rgba(15, 23, 42, 0.82)';
    g.fillRect(x, Math.max(0, y - 20), Math.max(100, w), 18);
    g.fillStyle = 'rgba(226, 232, 240, 0.95)';
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(`${hand.pose} (${Math.round(hand.confidence * 100)}%)`, x + 4, Math.max(12, y - 7));
  }

  if (hud) {
    g.fillStyle = 'rgba(15, 23, 42, 0.75)';
    g.fillRect(10, 10, 320, 66);
    g.fillStyle = 'rgba(226, 232, 240, 0.95)';
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(`gesture: ${hud.activeGesture || 'idle'}`, 16, 28);
    g.fillText(`focus: ${hud.focusedControlKey || 'n/a'}`, 16, 45);
    g.fillText(`confidence: ${Math.round((hud.confidence || 0) * 100)}%`, 16, 62);
  }
}
