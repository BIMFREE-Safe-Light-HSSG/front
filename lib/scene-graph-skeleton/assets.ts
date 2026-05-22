import { parseInspectionHistory } from "@/lib/scene-graph-skeleton/inspection-history";
import type { FireIncident } from "@/lib/fire-incidents/types";
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
  door: {
    label: "문",
    color: "#a8bdd9",
    emissive: "#5c6b82",
    ringColor: "#fde68a",
  },
  window: {
    label: "창문",
    color: "#7dd3fc",
    emissive: "#0284c7",
    ringColor: "#bae6fd",
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

  const inspection_history = parseInspectionHistory(raw.inspection_history);

  return {
    id: raw.id,
    class: cls,
    position: raw.position,
    status: raw.status,
    ...(inspection_history ? { inspection_history } : {}),
  };
}

/** skeleton Z-up: center[2] ± height/2 */
const ZONE_Z_MATCH_EPSILON = 0.02;

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

function zoneVerticalBounds(zone: ZoneNode): { minZ: number; maxZ: number } {
  const half = zone.geometry.height / 2;
  const centerZ = zone.geometry.center[2];
  return { minZ: centerZ - half, maxZ: centerZ + half };
}

function isPositionInsideZoneVertical(z: number, zone: ZoneNode): boolean {
  const { minZ, maxZ } = zoneVerticalBounds(zone);
  return z >= minZ - ZONE_Z_MATCH_EPSILON && z <= maxZ + ZONE_Z_MATCH_EPSILON;
}

function verticalDistanceToZone(z: number, zone: ZoneNode): number {
  const { minZ, maxZ } = zoneVerticalBounds(zone);
  if (z < minZ) return minZ - z;
  if (z > maxZ) return z - maxZ;
  return 0;
}

function isPositionInZonePlan(x: number, y: number, zone: ZoneNode): boolean {
  return pointInPolygon(x, y, zone.geometry.coordinates);
}

/** 평면·수직 모두 고려해 가장 적합한 구역 선택 */
function pickBestZoneForPosition(
  zones: ZoneNode[],
  x: number,
  y: number,
  z: number,
): ZoneNode | undefined {
  const planMatches = zones.filter((zone) => isPositionInZonePlan(x, y, zone));
  if (planMatches.length === 0) return undefined;

  const ranked = planMatches.map((zone) => ({
    zone,
    containsZ: isPositionInsideZoneVertical(z, zone),
    verticalDistance: verticalDistanceToZone(z, zone),
    height: zone.geometry.height,
    centerZDelta: Math.abs(zone.geometry.center[2] - z),
  }));

  const contained = ranked.filter((entry) => entry.containsZ);
  const pool = contained.length > 0 ? contained : ranked;

  pool.sort((a, b) => {
    if (a.verticalDistance !== b.verticalDistance) {
      return a.verticalDistance - b.verticalDistance;
    }
    if (a.height !== b.height) {
      return a.height - b.height;
    }
    return a.centerZDelta - b.centerZDelta;
  });

  return pool[0]?.zone;
}

export function findZoneForAssetPosition(
  zones: ZoneNode[],
  position: SkeletonAsset["position"],
): { zoneId: string; zoneName: string } | undefined {
  const [x, y, z] = position;
  const zone = pickBestZoneForPosition(zones, x, y, z);

  if (!zone) {
    return undefined;
  }

  return { zoneId: zone.id, zoneName: zone.name };
}

/** 화재 좌표가 속한 구역 ID (소방 뷰 붉은 강조용) */
export function zoneIdsContainingFireIncidents(
  zones: ZoneNode[],
  incidents: readonly FireIncident[],
): Set<string> {
  const ids = new Set<string>();

  for (const incident of incidents) {
    const match = findZoneForAssetPosition(zones, incident.position);
    if (match) {
      ids.add(match.zoneId);
    }
  }

  return ids;
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
        : findZoneForAssetPosition(zones, asset.position);

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

