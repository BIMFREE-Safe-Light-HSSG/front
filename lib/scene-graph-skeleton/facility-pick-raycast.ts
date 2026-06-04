import * as THREE from "three";

import { resolveFacilityAssetFromIntersections } from "./asset-pick";
import type { FacilityAssetRef } from "./types";

const pointerNdc = new THREE.Vector2();

/** R3F event.intersections는 가장 가까운 핸들러만 담는 경우가 있어, 포인터로 pick mesh를 직접 조준 */
export function raycastFacilityPickMesh(
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  domElement: HTMLElement,
  clientX: number,
  clientY: number,
  pickMesh: THREE.InstancedMesh | null | undefined,
  assets: FacilityAssetRef[],
): FacilityAssetRef | null {
  if (!pickMesh || assets.length === 0) return null;

  const rect = domElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);

  const hits = raycaster.intersectObject(pickMesh, false);
  return resolveFacilityAssetFromIntersections(assets, hits);
}
