import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";

/** 소방 뷰어에서 건물 구조로 함께 표시하는 시설 분류 */
export const STRUCTURAL_ASSET_CLASSES = new Set(["door", "window"]);

export function isStructuralAssetClass(assetClass: string) {
  return STRUCTURAL_ASSET_CLASSES.has(assetClass.trim().toLowerCase());
}

export function filterAssetsForViewerMode(
  assets: FacilityAssetRef[],
  enableFacilityTools: boolean,
): FacilityAssetRef[] {
  if (enableFacilityTools) {
    return assets;
  }

  return assets.filter((asset) => isStructuralAssetClass(asset.class));
}
