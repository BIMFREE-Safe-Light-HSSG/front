import { isStructuralAssetClass } from "./structural-assets";
import type { FacilityAssetRef } from "./types";

export const ASSET_MARKER_CORE_RADIUS = 0.34;
export const ASSET_MARKER_HIT_RADIUS = 0.58;

export function hexToThreeColor(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
}

export type AssetMarkerInteractionState = {
  selectedAssetId: string | null;
  hoveredAssetId: string | null;
  highlightAssetIds: ReadonlySet<string>;
};

/** 구·링 마커용 (door/window 등 구조 mesh 제외). */
export function isInstancedMarkerEligible(asset: FacilityAssetRef): boolean {
  return !isStructuralAssetClass(asset.class);
}

/** Full AssetSpot (rings, pulse, useFrame) — keep count low. */
export function assetNeedsAnimatedSpot(
  asset: FacilityAssetRef,
  state: AssetMarkerInteractionState,
): boolean {
  if (!isInstancedMarkerEligible(asset)) return true;
  if (state.selectedAssetId === asset.id) return true;
  if (state.hoveredAssetId === asset.id) return true;
  const status = asset.status;
  return (
    status === "fault" ||
    status === "offline" ||
    status === "inspection_due"
  );
}

export function partitionFacilityAssets(
  assets: FacilityAssetRef[],
  state: AssetMarkerInteractionState,
): {
  instanced: FacilityAssetRef[];
  animated: FacilityAssetRef[];
  structural: FacilityAssetRef[];
} {
  const instanced: FacilityAssetRef[] = [];
  const animated: FacilityAssetRef[] = [];
  const structural: FacilityAssetRef[] = [];

  for (const asset of assets) {
    if (!isInstancedMarkerEligible(asset)) {
      structural.push(asset);
      continue;
    }
    if (assetNeedsAnimatedSpot(asset, state)) {
      animated.push(asset);
    } else {
      instanced.push(asset);
    }
  }

  return { instanced, animated, structural };
}

export function groupAssetsByClass(
  assets: FacilityAssetRef[],
): Map<string, FacilityAssetRef[]> {
  const groups = new Map<string, FacilityAssetRef[]>();

  for (const asset of assets) {
    const list = groups.get(asset.class);
    if (list) {
      list.push(asset);
    } else {
      groups.set(asset.class, [asset]);
    }
  }

  return groups;
}
