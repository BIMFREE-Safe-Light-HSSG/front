import type { ZoneNode } from "./types";

function distPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  let t = abLen2 === 0 ? 0 : (apx * abx + apy * aby) / abLen2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Skeleton floor plan (x, y) → Three.js Y rotation so door/window face the nearest zone wall.
 */
export function wallYawFromZones(zones: ZoneNode[], skeletonX: number, skeletonY: number): number {
  let bestDist = Infinity;
  let bestYaw = 0;

  for (const zone of zones) {
    const coords = zone.geometry.coordinates;
    if (coords.length < 2) continue;

    for (let i = 0; i < coords.length; i++) {
      const [ax, ay] = coords[i]!;
      const [bx, by] = coords[(i + 1) % coords.length]!;
      const dist = distPointToSegment(skeletonX, skeletonY, ax, ay, bx, by);

      if (dist < bestDist) {
        bestDist = dist;
        const ex = bx - ax;
        const ey = by - ay;
        bestYaw = Math.atan2(-ey, ex);
      }
    }
  }

  return bestYaw;
}
