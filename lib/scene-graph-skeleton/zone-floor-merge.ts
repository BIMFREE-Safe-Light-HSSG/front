import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";

import { createZoneFloorWorldGeometry } from "./zone-geometry";
import type { ZoneNode } from "./types";

/** 벽 shell(ZONE_PALETTE)과 구분되는 밝은 바닥 톤 */
const FLOOR_PALETTE = [
  0xf8fafc, 0xf1f5f9, 0xfaf8f5, 0xf0f7f4, 0xfaf5f8, 0xf3f6fb, 0xf9f7f0, 0xf2f4fa,
] as const;

export function resolveZoneFloorColor(index: number): THREE.Color {
  return new THREE.Color(FLOOR_PALETTE[index % FLOOR_PALETTE.length]!);
}

/** 구역 폴리곤 바닥을 한 장의 슬래브로 merge */
export function buildMergedFloorGeometry(
  zones: ZoneNode[],
): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];

  for (let index = 0; index < zones.length; index++) {
    const zone = zones[index]!;
    const geo = createZoneFloorWorldGeometry(zone);
    if (!geo) continue;

    const color = resolveZoneFloorColor(index);
    const positionCount = geo.attributes.position.count;
    const colors = new Float32Array(positionCount * 3);
    for (let i = 0; i < positionCount; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    parts.push(geo);
  }

  if (parts.length === 0) return null;

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

export const MERGED_FLOOR_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  color: 0xffffff,
  metalness: 0.06,
  roughness: 0.78,
  emissive: 0xf1f5f9,
  emissiveIntensity: 0.06,
  side: THREE.FrontSide,
  depthWrite: true,
});
