import type {
  AssetInspectionRecord,
  FacilityAssetRef,
} from "@/lib/scene-graph-skeleton/types";

export type { AssetInspectionRecord };

export type InspectionRecord = AssetInspectionRecord & {
  assetId?: string;
  assetLabel?: string;
  zoneName?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseInspectionHistory(raw: unknown): AssetInspectionRecord[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const out: AssetInspectionRecord[] = [];

  for (const item of raw) {
    if (!isRecord(item)) continue;
    if (
      typeof item.id !== "string" ||
      typeof item.date !== "string" ||
      typeof item.action !== "string" ||
      typeof item.result !== "string"
    ) {
      continue;
    }

    out.push({
      id: item.id,
      date: item.date,
      action: item.action,
      result: item.result,
      ...(typeof item.inspector === "string" ? { inspector: item.inspector } : {}),
    });
  }

  return out.length > 0 ? out : undefined;
}

function assetLabel(asset: FacilityAssetRef) {
  return `${asset.class} · ${asset.id}`;
}

export function inspectionRecordsForAsset(asset: FacilityAssetRef): InspectionRecord[] {
  return (asset.inspection_history ?? []).map((record) => ({
    ...record,
    assetId: asset.id,
    assetLabel: assetLabel(asset),
    zoneName: asset.zoneName,
  }));
}

/** 건물·시설 점검 이력 통합 (scene_graph.inspection_history + 각 asset.inspection_history) */
export function collectBuildingInspectionHistory(
  assets: FacilityAssetRef[],
  buildingRecords?: AssetInspectionRecord[],
): InspectionRecord[] {
  const fromBuilding = (buildingRecords ?? []).map((record) => ({ ...record }));
  const fromAssets = assets.flatMap(inspectionRecordsForAsset);

  return [...fromBuilding, ...fromAssets].sort((a, b) => b.date.localeCompare(a.date));
}

export function collectInspectionHistory(
  assets: FacilityAssetRef[],
  options?: {
    selectedAssetId?: string | null;
    buildingRecords?: AssetInspectionRecord[];
  },
): InspectionRecord[] {
  const { selectedAssetId, buildingRecords } = options ?? {};

  if (selectedAssetId) {
    const asset = assets.find((item) => item.id === selectedAssetId);
    if (!asset) {
      return [];
    }

    return inspectionRecordsForAsset(asset).sort((a, b) => b.date.localeCompare(a.date));
  }

  return collectBuildingInspectionHistory(assets, buildingRecords);
}

export function formatInspectionDate(date: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}
