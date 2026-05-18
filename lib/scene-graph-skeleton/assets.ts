import type { AssetStatus, FacilityAssetRef, SceneGraphSkeleton, SkeletonAsset, ZoneNode } from "./types";

export type AssetClassStyle = {
  label: string;
  color: string;
  emissive: string;
  ringColor: string;
};

const DEFAULT_STYLE: AssetClassStyle = {
  label: "기타",
  color: "#94a3b8",
  emissive: "#64748b",
  ringColor: "#cbd5e1",
};

export const ASSET_CLASS_STYLES: Record<string, AssetClassStyle> = {
  소화기: {
    label: "소화기",
    color: "#ef4444",
    emissive: "#b91c1c",
    ringColor: "#fca5a5",
  },
  온도센서: {
    label: "온도센서",
    color: "#38bdf8",
    emissive: "#0284c7",
    ringColor: "#7dd3fc",
  },
  CCTV: {
    label: "CCTV",
    color: "#a78bfa",
    emissive: "#7c3aed",
    ringColor: "#c4b5fd",
  },
  비상구: {
    label: "비상구",
    color: "#4ade80",
    emissive: "#16a34a",
    ringColor: "#86efac",
  },
  조명: {
    label: "조명",
    color: "#fbbf24",
    emissive: "#d97706",
    ringColor: "#fde68a",
  },
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, { label: string; tone: string }> = {
  normal: { label: "정상", tone: "text-emerald-700 bg-emerald-500/15" },
  inspection_due: { label: "점검 예정", tone: "text-amber-800 bg-amber-500/20" },
  fault: { label: "이상", tone: "text-red-800 bg-red-500/20" },
  offline: { label: "오프라인", tone: "text-zinc-600 bg-zinc-500/15" },
};

export function assetClassStyle(assetClass: string): AssetClassStyle {
  return ASSET_CLASS_STYLES[assetClass] ?? { ...DEFAULT_STYLE, label: assetClass };
}

function normalizeAsset(raw: SkeletonAsset): SkeletonAsset | null {
  if (!raw?.id || !raw.position || raw.position.length < 3) return null;
  const cls =
    raw.class?.trim() ||
    raw.category?.trim() ||
    raw.name?.trim() ||
    (raw.type === "ASSET" ? "시설" : raw.type)?.trim() ||
    "기타";

  return {
    id: raw.id,
    class: cls,
    position: raw.position,
    status: raw.status,
  };
}

function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function findZoneForPosition(
  zones: ZoneNode[],
  position: SkeletonAsset["position"],
): { zoneId: string; zoneName: string } | undefined {
  const [x, y] = position;

  for (const zone of zones) {
    if (pointInPolygon(x, y, zone.geometry.coordinates)) {
      return { zoneId: zone.id, zoneName: zone.name };
    }
  }

  return undefined;
}

export function collectAssets(doc: SceneGraphSkeleton): FacilityAssetRef[] {
  const zones = doc.scene_graph.nodes.filter((node): node is ZoneNode => node.type === "ZONE");
  const out: FacilityAssetRef[] = [];
  const seen = new Set<string>();

  const push = (raw: SkeletonAsset, zoneId?: string, zoneName?: string) => {
    const asset = normalizeAsset(raw);
    if (!asset || seen.has(asset.id)) return;

    seen.add(asset.id);
    const zone =
      zoneId && zoneName
        ? { zoneId, zoneName }
        : findZoneForPosition(zones, asset.position);

    out.push({ ...asset, ...zone });
  };

  for (const raw of doc.scene_graph.assets ?? []) {
    push(raw);
  }

  for (const zone of zones) {
    for (const raw of zone.assets ?? []) {
      push(raw, zone.id, zone.name);
    }
  }

  return out;
}

export function uniqueAssetClasses(assets: FacilityAssetRef[]): string[] {
  return [...new Set(assets.map((asset) => asset.class))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}

export function placeholderMaintenanceRecords(assetId: string) {
  return [
    { id: `${assetId}-r1`, date: "2025-11-12", action: "정기 점검", result: "이상 없음" },
    { id: `${assetId}-r2`, date: "2025-08-03", action: "교체 검토", result: "유효기간 확인" },
  ];
}
