// Newest point first. Samples are measured in world distance, not frame count.
export function pointAlongTrail(points, distance) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length >= distance && length > 0) {
      const t = distance / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    distance -= length;
  }
  return points.at(-1);
}
export function recordTrail(points, point, maxDistance) {
  if (!points.length || Math.hypot(points[0].x-point.x, points[0].y-point.y) >= 1) points.unshift(point);
  let distance = 0;
  for (let i=1;i<points.length;i++) {
    distance += Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
    if (distance > maxDistance) { points.length = i+1; break; }
  }
}
