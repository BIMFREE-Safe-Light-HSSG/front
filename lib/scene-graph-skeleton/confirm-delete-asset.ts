import type { FacilityAssetRef } from "./types"

export function confirmDeleteAsset(asset: Pick<FacilityAssetRef, "id" | "class">): boolean {
  return window.confirm(
    `"${asset.class}" (${asset.id}) 시설을 삭제할까요?\n삭제 내용은 scene graph JSON에 즉시 반영됩니다.`,
  )
}
