/**
 * Gemini fire-risk overlay의 target_node_id → 뷰어 zone/asset 매핑.
 */
import type { FacilityAssetRef, ZoneNode } from "@/lib/scene-graph-skeleton/types";

export type FireRiskTarget =
  | { kind: "zone"; zoneId: string }
  | { kind: "asset"; assetId: string; zoneId?: string };

export function resolveFireRiskTargetNodeId(
  zones: ZoneNode[],
  assets: FacilityAssetRef[],
  targetNodeId: string,
): FireRiskTarget | null {
  const trimmed = targetNodeId.trim();
  if (!trimmed) return null;

  const zone = zones.find((item) => item.id === trimmed);
  if (zone) return { kind: "zone", zoneId: zone.id };

  const asset = assets.find((item) => item.id === trimmed);
  if (asset) {
    return { kind: "asset", assetId: asset.id, zoneId: asset.zoneId };
  }

  for (const zoneNode of zones) {
    const nested = zoneNode.assets?.find((item) => item.id === trimmed);
    if (nested) {
      return { kind: "asset", assetId: nested.id, zoneId: zoneNode.id };
    }
  }

  const zoneByName = zones.find(
    (item) => item.name === trimmed || item.id.toLowerCase() === trimmed.toLowerCase(),
  );
  if (zoneByName) return { kind: "zone", zoneId: zoneByName.id };

  return null;
}

export function fireRiskHighlightZoneId(
  target: FireRiskTarget | null,
): string | null {
  if (!target) return null;
  if (target.kind === "zone") return target.zoneId;
  return target.zoneId ?? null;
}

export function fireRiskHighlightAssetId(
  target: FireRiskTarget | null,
): string | null {
  if (!target || target.kind !== "asset") return null;
  return target.assetId;
}
