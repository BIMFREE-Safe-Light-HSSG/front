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

function pickAction(item: Record<string, unknown>): string | null {
  if (typeof item.action === "string" && item.action.trim()) {
    return item.action.trim();
  }
  if (typeof item.details === "string" && item.details.trim()) {
    return item.details.trim();
  }
  return null;
}

/**
 * scene_graph `inspection_history` 배열 파싱.
 * - 레거시: id, date, action, result, inspector
 * - sg_3.json: date, result, inspector, details (id/action 없음)
 */
export function parseInspectionHistory(
  raw: unknown,
  options?: { idPrefix?: string },
): AssetInspectionRecord[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const prefix = options?.idPrefix ?? "inspection";
  const out: AssetInspectionRecord[] = [];

  for (let index = 0; index < raw.length; index++) {
    const item = raw[index];
    if (!isRecord(item)) continue;
    if (typeof item.date !== "string" || typeof item.result !== "string") {
      continue;
    }

    const action = pickAction(item);
    if (!action) continue;

    const id =
      typeof item.id === "string" && item.id.length > 0
        ? item.id
        : `${prefix}-${item.date}-${index}`;

    const details =
      typeof item.details === "string" && item.details.trim()
        ? item.details.trim()
        : undefined;

    out.push({
      id,
      date: item.date,
      action,
      result: item.result,
      ...(typeof item.inspector === "string" ? { inspector: item.inspector } : {}),
      ...(details ? { details } : {}),
    });
  }

  return out.length > 0 ? out : undefined;
}

/** 패널 제목 — action 우선, sg_3는 details 요약 */
export function inspectionRecordTitle(record: AssetInspectionRecord): string {
  return record.action;
}

/** action과 다를 때만 상세 줄 표시 */
export function inspectionRecordDetailLine(
  record: AssetInspectionRecord,
): string | null {
  const details = record.details?.trim();
  if (!details || details === record.action) return null;
  return details;
}

function assetLabel(asset: FacilityAssetRef) {
  return `${asset.class} · ${asset.id}`;
}

export function inspectionRecordsForAsset(asset: FacilityAssetRef): InspectionRecord[] {
  return (asset.inspection_history ?? []).map((record, index) => ({
    ...record,
    id: `${asset.id}-${record.id}-${index}`,
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
  const fromBuilding = (buildingRecords ?? []).map((record, index) => ({
    ...record,
    id: `building-${record.id}-${index}`,
  }));
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
