import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** 체스 폰 스케일 */
export const OCCUPANT_PAWN_SCALE = 1.5;

/** 폰 목(칼라) 중심 높이 — 글로우 배치용 */
export const OCCUPANT_COLLAR_CENTER_Y = 0.54 * OCCUPANT_PAWN_SCALE;

function s(value: number): number {
  return value * OCCUPANT_PAWN_SCALE;
}

function translateGeometry(geometry: THREE.BufferGeometry, x: number, y: number, z: number) {
  geometry.translate(s(x), s(y), s(z));
}

function paintGeometry(geometry: THREE.BufferGeometry, color: THREE.Color) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

/** 체스 폰 실루엣 — 넓은 받침 + 가느다란 기둥 + 목 + 둥근 머리 */
export function createOccupantPawnGeometry(): THREE.BufferGeometry {
  const ivory = new THREE.Color(0xf8fafc);
  const shadow = new THREE.Color(0xe2e8f0);

  const parts: THREE.BufferGeometry[] = [];

  const base = new THREE.CylinderGeometry(s(0.19), s(0.21), s(0.055), 22);
  translateGeometry(base, 0, s(0.0275), 0);
  paintGeometry(base, shadow);
  parts.push(base);

  const stem = new THREE.CylinderGeometry(s(0.05), s(0.14), s(0.4), 18);
  translateGeometry(stem, 0, s(0.055 + 0.2), 0);
  paintGeometry(stem, ivory);
  parts.push(stem);

  const collar = new THREE.SphereGeometry(s(0.105), 18, 18);
  collar.scale(1, 0.88, 1);
  translateGeometry(collar, 0, s(0.54), 0);
  paintGeometry(collar, ivory);
  parts.push(collar);

  const head = new THREE.SphereGeometry(s(0.072), 16, 16);
  translateGeometry(head, 0, s(0.7), 0);
  paintGeometry(head, ivory);
  parts.push(head);

  const merged = mergeGeometries(parts, false);
  for (const part of parts) {
    part.dispose();
  }

  if (!merged) {
    return new THREE.CylinderGeometry(s(0.12), s(0.18), s(0.6), 16);
  }

  merged.computeVertexNormals();
  return merged;
}

export const OCCUPANT_PAWN_GEOMETRY = createOccupantPawnGeometry();

export const OCCUPANT_PAWN_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.42,
  metalness: 0.12,
  emissive: 0x38bdf8,
  emissiveIntensity: 0.45,
});

/** 바닥 강조 링 (안쪽) */
export const OCCUPANT_EMPHASIS_RING_GEOMETRY = new THREE.RingGeometry(s(0.24), s(0.3), 32);
export const OCCUPANT_EMPHASIS_RING_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

/** 바닥 강조 오라 (바깥, 펄스) */
export const OCCUPANT_AURA_RING_GEOMETRY = new THREE.RingGeometry(s(0.32), s(0.42), 32);
export const OCCUPANT_AURA_RING_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x7dd3fc,
  transparent: true,
  opacity: 0.28,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

/** 폰 목 부분 수직 글로우 */
export const OCCUPANT_COLLAR_GLOW_GEOMETRY = new THREE.SphereGeometry(s(0.13), 14, 10);
export const OCCUPANT_COLLAR_GLOW_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xbae6fd,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

/** @deprecated 체스 폰으로 대체 */
export const OCCUPANT_HUMAN_GEOMETRY = OCCUPANT_PAWN_GEOMETRY;
export const OCCUPANT_HUMAN_MATERIAL = OCCUPANT_PAWN_MATERIAL;
export const OCCUPANT_FLOOR_RING_GEOMETRY = OCCUPANT_EMPHASIS_RING_GEOMETRY;
export const OCCUPANT_FLOOR_RING_MATERIAL = OCCUPANT_EMPHASIS_RING_MATERIAL;
