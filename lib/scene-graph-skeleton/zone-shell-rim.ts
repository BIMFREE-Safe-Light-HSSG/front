import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";

import type { ZoneNode } from "./types";

/** 구역 상단 윤곽(천장선) — 건물 실루엣 강조 */
export function createZoneTopOutlineGeometry(
  zone: ZoneNode,
): THREE.BufferGeometry | null {
  const { coordinates, center, height } = zone.geometry;
  if (coordinates.length < 2 || height <= 0) return null;

  const y = center[2] + height / 2 + 0.04;
  const points: THREE.Vector3[] = [];
  for (const [x, planY] of coordinates) {
    points.push(new THREE.Vector3(x, y, planY));
  }
  points.push(
    new THREE.Vector3(coordinates[0]![0], y, coordinates[0]![1]),
  );
  return new THREE.BufferGeometry().setFromPoints(points);
}

export function buildMergedZoneRimGeometry(
  zones: ZoneNode[],
): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];

  for (const zone of zones) {
    const outline = createZoneTopOutlineGeometry(zone);
    if (!outline) continue;
    parts.push(outline);
  }

  if (parts.length === 0) return null;
  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

export const ZONE_RIM_LINE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x94a3b8,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
});
