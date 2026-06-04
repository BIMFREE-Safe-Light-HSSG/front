import type { ZoneNode } from "./types";

function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export type WallProjection = {
  x: number;
  y: number;
  yaw: number;
  distance: number;
  zone: ZoneNode | null;
};

export function projectPointOnWallSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { x: number; y: number; distance: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  let t = abLen2 === 0 ? 0 : (apx * abx + apy * aby) / abLen2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * abx;
  const y = ay + t * aby;
  return { x, y, distance: Math.hypot(px - x, py - y) };
}

/** 평면상 가장 가까운 구역 외벽 선분에 투영 */
export function nearestWallProjection(
  zones: ZoneNode[],
  skeletonX: number,
  skeletonY: number,
  options?: { preferZoneId?: string },
): WallProjection {
  let searchZones = zones;
  if (options?.preferZoneId) {
    const preferred = zones.find((z) => z.id === options.preferZoneId);
    if (preferred) searchZones = [preferred];
  } else {
    const inside = zones.filter((zone) =>
      pointInPolygon(skeletonX, skeletonY, zone.geometry.coordinates),
    );
    if (inside.length > 0) searchZones = inside;
  }

  let bestDist = Infinity;
  let bestX = skeletonX;
  let bestY = skeletonY;
  let bestYaw = 0;
  let bestZone: ZoneNode | null = null;

  for (const zone of searchZones) {
    const coords = zone.geometry.coordinates;
    if (coords.length < 2) continue;

    for (let i = 0; i < coords.length; i++) {
      const [ax, ay] = coords[i]!;
      const [bx, by] = coords[(i + 1) % coords.length]!;
      const proj = projectPointOnWallSegment(skeletonX, skeletonY, ax, ay, bx, by);

      if (proj.distance < bestDist) {
        bestDist = proj.distance;
        bestX = proj.x;
        bestY = proj.y;
        const ex = bx - ax;
        const ey = by - ay;
        bestYaw = Math.atan2(-ey, ex);
        bestZone = zone;
      }
    }
  }

  return {
    x: bestX,
    y: bestY,
    yaw: bestYaw,
    distance: bestDist,
    zone: bestZone,
  };
}

/**
 * Skeleton floor plan (x, y) → Three.js Y rotation so door/window face the nearest zone wall.
 */
export function wallYawFromZones(
  zones: ZoneNode[],
  skeletonX: number,
  skeletonY: number,
): number {
  return nearestWallProjection(zones, skeletonX, skeletonY).yaw;
}
