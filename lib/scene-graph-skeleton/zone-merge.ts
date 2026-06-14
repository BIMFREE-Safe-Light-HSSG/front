import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";

import {
  createZoneExtrudeGeometry,
  FIREFIGHTER_FIRE_ZONE_COLOR,
  FIREFIGHTER_NEUTRAL_ZONE_COLOR,
  stripDownwardCapFaces,
  stripUpwardCapFaces,
  zoneAccentColor,
  zoneMeshTransform,
} from "./zone-geometry";
import type { ZoneNode } from "./types";

export type ZoneShellVisualState = {
  zoneId: string;
  index: number;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  firefighterZoneView: boolean;
  isFireZone: boolean;
  fireRiskSelected?: boolean;
};

const shellColorScratch = new THREE.Color();
const matrixScratch = new THREE.Matrix4();
const positionScratch = new THREE.Vector3();
const quaternionScratch = new THREE.Quaternion();
const scaleScratch = new THREE.Vector3(1, 1, 1);

export function resolveZoneShellColor(
  state: ZoneShellVisualState,
  options?: { openRoof?: boolean },
): THREE.Color {
  const {
    index,
    selected,
    highlighted,
    dimmed,
    firefighterZoneView,
    isFireZone,
    fireRiskSelected = false,
  } = state;

  if (fireRiskSelected) {
    shellColorScratch.set(0xfbbf24);
    shellColorScratch.lerp(new THREE.Color(0xef4444), 0.35);
    return shellColorScratch;
  }

  if (firefighterZoneView) {
    if (isFireZone) {
      shellColorScratch.set(selected ? 0xfca5a5 : FIREFIGHTER_FIRE_ZONE_COLOR);
      if (dimmed) shellColorScratch.multiplyScalar(0.45);
      return shellColorScratch;
    }
    shellColorScratch.set(FIREFIGHTER_NEUTRAL_ZONE_COLOR);
    if (selected) shellColorScratch.lerp(new THREE.Color(0xc8d9eb), 0.45);
    if (dimmed) shellColorScratch.multiplyScalar(0.35);
    return shellColorScratch;
  }

  const base = zoneAccentColor(index);
  shellColorScratch.set(base);

  if (highlighted) {
    shellColorScratch.set(0xfff4a3);
  } else if (selected) {
    shellColorScratch.lerp(new THREE.Color(0xffffff), 0.55);
  }

  if (dimmed) shellColorScratch.multiplyScalar(0.28);
  else if (!selected && !highlighted) shellColorScratch.multiplyScalar(0.82);

  // 천장 OFF(컷어웨이): 바닥(밝은 중성색)과 벽면 대비 강화
  if (options?.openRoof && !dimmed && !highlighted) {
    if (firefighterZoneView && !isFireZone) {
      shellColorScratch.multiplyScalar(selected ? 0.92 : 0.8);
    } else if (!firefighterZoneView) {
      shellColorScratch.multiplyScalar(selected ? 0.94 : 0.78);
    }
  }

  return shellColorScratch;
}

export function buildMergedZoneShellGeometry(
  zones: ZoneNode[],
  states: ZoneShellVisualState[],
  options?: { openRoof?: boolean },
): THREE.BufferGeometry | null {
  const openRoof = options?.openRoof ?? false;
  const stateById = new Map(states.map((state) => [state.zoneId, state]));
  const parts: THREE.BufferGeometry[] = [];

  for (let index = 0; index < zones.length; index++) {
    const zone = zones[index]!;
    const base = createZoneExtrudeGeometry(zone);
    if (!base) continue;

    const visual = stateById.get(zone.id) ?? {
      zoneId: zone.id,
      index,
      selected: false,
      highlighted: false,
      dimmed: false,
      firefighterZoneView: false,
      isFireZone: false,
    };

    const geo = base.clone();
    const color = resolveZoneShellColor(visual, { openRoof });
    const positionCount = geo.attributes.position.count;
    const colors = new Float32Array(positionCount * 3);
    for (let i = 0; i < positionCount; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const transform = zoneMeshTransform(zone);
    quaternionScratch.setFromEuler(transform.rotation);
    matrixScratch.compose(
      transform.position,
      quaternionScratch,
      scaleScratch,
    );
    geo.applyMatrix4(matrixScratch);
    let shellGeo: THREE.BufferGeometry = geo;
    if (openRoof) {
      shellGeo = stripUpwardCapFaces(shellGeo, 0.985);
      if (shellGeo !== geo) geo.dispose();
      shellGeo.computeVertexNormals();
    }
    const withoutFloor = stripDownwardCapFaces(shellGeo);
    if (withoutFloor !== shellGeo) shellGeo.dispose();
    parts.push(withoutFloor);
    base.dispose();
  }

  if (parts.length === 0) return null;

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

export const SHARED_ZONE_SHELL_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  metalness: 0.08,
  roughness: 0.72,
  side: THREE.FrontSide,
});

export function createMergedZoneShellMaterial(
  transparent: boolean,
  openRoof = false,
): THREE.MeshStandardMaterial {
  if (!transparent && !openRoof) return SHARED_ZONE_SHELL_MATERIAL;

  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.08,
    roughness: 0.72,
    transparent,
    opacity: transparent ? 0.34 : 1,
    depthWrite: !transparent,
    side: THREE.DoubleSide,
  });
}
