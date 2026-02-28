export function distance2d(a, b) {
  const dx = (a?.x || 0) - (b?.x || 0);
  const dy = (a?.y || 0) - (b?.y || 0);
  return Math.hypot(dx, dy);
}

export function centroid(points) {
  if (!Array.isArray(points) || !points.length) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point.x || 0;
    sumY += point.y || 0;
  }
  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

export function boundingBox(points) {
  if (!Array.isArray(points) || !points.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x || 0);
    minY = Math.min(minY, point.y || 0);
    maxX = Math.max(maxX, point.x || 0);
    maxY = Math.max(maxY, point.y || 0);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

export function velocityFromPoints(previousPoint, nextPoint, dtSeconds) {
  if (!previousPoint || !nextPoint || !Number.isFinite(dtSeconds) || dtSeconds <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (nextPoint.x - previousPoint.x) / dtSeconds,
    y: (nextPoint.y - previousPoint.y) / dtSeconds,
  };
}

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
