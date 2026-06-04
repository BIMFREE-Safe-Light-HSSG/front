import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";

import { isRouteAssetClass } from "./route-assets";
import { isStructuralAssetClass } from "./structural-assets";
import type { FacilityAssetRef } from "./types";

/** door/window 제외 — 통합 pick 대상 */
export function listFacilityPickAssets(
  assets: FacilityAssetRef[],
): FacilityAssetRef[] {
  return assets.filter(
    (asset) => !isStructuralAssetClass(asset.class) && !isRouteAssetClass(asset.class),
  );
}

/** Instanced pick mesh (`SceneAssetPick`) */
export function resolveInstancedAssetFromIntersections(
  assets: FacilityAssetRef[],
  intersections: THREE.Intersection[],
): FacilityAssetRef | null {
  for (const hit of intersections) {
    if (
      hit.object.userData?.assetPick === true &&
      hit.instanceId !== undefined &&
      hit.instanceId >= 0
    ) {
      return assets[hit.instanceId] ?? null;
    }
  }
  return null;
}

/** `AssetSpot` hit sphere (`userData.assetId`) */
export function resolveSpotAssetIdFromIntersections(
  intersections: THREE.Intersection[],
): string | null {
  for (const hit of intersections) {
    const id = hit.object.userData?.assetId;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

export function resolveFacilityAssetFromIntersections(
  instancedAssets: FacilityAssetRef[],
  intersections: THREE.Intersection[],
): FacilityAssetRef | null {
  const spotId = resolveSpotAssetIdFromIntersections(intersections);
  if (spotId) {
    return (
      instancedAssets.find((a) => a.id === spotId) ??
      ({ id: spotId } as FacilityAssetRef)
    );
  }
  return resolveInstancedAssetFromIntersections(instancedAssets, intersections);
}

export function resolveFacilityAssetFromPointer(
  instancedAssets: FacilityAssetRef[],
  event: ThreeEvent<MouseEvent | PointerEvent>,
): FacilityAssetRef | null {
  return resolveFacilityAssetFromIntersections(
    instancedAssets,
    event.intersections,
  );
}

export function closestAssetPickDistance(
  intersections: THREE.Intersection[],
): number | null {
  let best: number | null = null;
  for (const hit of intersections) {
    const isPick =
      hit.object.userData?.assetPick === true ||
      typeof hit.object.userData?.assetId === "string";
    if (!isPick) continue;
    if (best === null || hit.distance < best) best = hit.distance;
  }
  return best;
}
