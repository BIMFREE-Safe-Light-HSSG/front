import * as THREE from "three";

import { assetClassStyle } from "./assets";
import { hexToThreeColor } from "./asset-marker-utils";

const materialByClass = new Map<string, THREE.MeshStandardMaterial>();

export function getSharedAssetMarkerMaterial(
  assetClass: string,
): THREE.MeshStandardMaterial {
  const cached = materialByClass.get(assetClass);
  if (cached) return cached;

  const style = assetClassStyle(assetClass);
  const material = new THREE.MeshStandardMaterial({
    color: hexToThreeColor(style.color),
    emissive: hexToThreeColor(style.emissive),
    emissiveIntensity: 0.4,
    metalness: 0.45,
    roughness: 0.2,
  });
  materialByClass.set(assetClass, material);
  return material;
}

export const SHARED_ASSET_MARKER_SPHERE = new THREE.SphereGeometry(
  0.34,
  12,
  12,
);

export const SHARED_ASSET_HIT_SPHERE = new THREE.SphereGeometry(
  0.58,
  10,
  10,
);

/** 반투명 shell 관통 클릭 — pick 여유 확대 */
export const SHARED_ASSET_HIT_SPHERE_XRAY = new THREE.SphereGeometry(
  0.82,
  10,
  10,
);

const pickMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: false,
});

export function getAssetPickMaterial(): THREE.MeshBasicMaterial {
  return pickMaterial;
}
