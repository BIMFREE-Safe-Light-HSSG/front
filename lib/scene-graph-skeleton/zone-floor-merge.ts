import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";

import {
  createZoneFloorPickGeometry,
  zoneMeshTransform,
} from "./zone-geometry";
import type { ZoneNode } from "./types";

const matrixScratch = new THREE.Matrix4();
const quaternionScratch = new THREE.Quaternion();
const positionScratch = new THREE.Vector3();
const scaleScratch = new THREE.Vector3(1, 1, 1);

/** 구역 폴리곤 바닥을 한 장의 슬래브로 merge */
export function buildMergedFloorGeometry(
  zones: ZoneNode[],
): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];

  for (const zone of zones) {
    const floor = createZoneFloorPickGeometry(zone);
    if (!floor) continue;

    const transform = zoneMeshTransform(zone);
    quaternionScratch.setFromEuler(transform.rotation);
    matrixScratch.compose(
      transform.position,
      quaternionScratch,
      scaleScratch,
    );

    const geo = floor.clone();
    geo.applyMatrix4(matrixScratch);
    parts.push(geo);
    floor.dispose();
  }

  if (parts.length === 0) return null;

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

export const MERGED_FLOOR_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  metalness: 0.12,
  roughness: 0.88,
  side: THREE.DoubleSide,
});
