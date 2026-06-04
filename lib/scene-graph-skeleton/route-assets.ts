import { zoneFloorSkeletonZ } from "@/lib/scene-graph-skeleton/structural-placement";
import type {
  FacilityAssetRef,
  SceneGraphSkeleton,
  SkeletonAsset,
  Vec3,
  ZoneNode,
} from "@/lib/scene-graph-skeleton/types";

export type RoutePath = {
  id: string;
  zoneId?: string;
  zoneName?: string;
  points: Vec3[];
};

const ROUTE_CLASS = "route";
const ROUTE_ENDPOINT_EXTENSION_M = 2.5;
const ROUTE_FLOOR_LIFT = 0.04;
const ROUTE_LIST_KEYS = ["list", "path", "points", "waypoints", "polyline"] as const;

export function isRouteAssetClass(assetClass: string): boolean {
  return assetClass.trim().toLowerCase() === ROUTE_CLASS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRoutePoint(item: unknown): Vec3 | null {
  if (Array.isArray(item) && item.length >= 3) {
    const x = Number(item[0]);
    const y = Number(item[1]);
    const z = Number(item[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return [x, y, z];
    }
    return null;
  }

  if (isRecord(item) && Array.isArray(item.position) && item.position.length >= 3) {
    const x = Number(item.position[0]);
    const y = Number(item.position[1]);
    const z = Number(item.position[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return [x, y, z];
    }
  }

  return null;
}

function extractRouteListPoints(raw: SkeletonAsset): Vec3[] | null {
  const record = raw as SkeletonAsset & Record<string, unknown>;

  for (const key of ROUTE_LIST_KEYS) {
    const source = record[key];
    if (!Array.isArray(source) || source.length < 2) continue;

    const points: Vec3[] = [];
    for (const item of source) {
      const point = normalizeRoutePoint(item);
      if (point) points.push(point);
    }

    if (points.length >= 2) return points;
  }

  return null;
}

function extendRoutePathEndpoints(points: Vec3[], extensionM: number): Vec3[] {
  if (points.length < 2 || extensionM <= 0) return points;

  const shift = (anchor: Vec3, toward: Vec3): Vec3 => {
    const dx = toward[0] - anchor[0];
    const dy = toward[1] - anchor[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return anchor;
    const t = extensionM / len;
    return [anchor[0] - dx * t, anchor[1] - dy * t, anchor[2]];
  };

  const out = points.map((p): Vec3 => [p[0], p[1], p[2]]);
  out[0] = shift(out[0]!, out[1]!);
  const last = out.length - 1;
  out[last] = shift(out[last]!, out[last - 1]!);
  return out;
}

function clampRouteSkeletonZ(z: number, floorZ?: number): number {
  let lifted = z;
  if (floorZ !== undefined) lifted = Math.max(lifted, floorZ + ROUTE_FLOOR_LIFT);
  return Math.max(lifted, 0);
}

function liftPointToZoneFloor(point: Vec3, zone: ZoneNode | undefined): Vec3 {
  const floorZ = zone ? zoneFloorSkeletonZ(zone) : undefined;
  return [point[0], point[1], clampRouteSkeletonZ(point[2], floorZ)];
}

function finalizeRoutePath(
  id: string,
  points: Vec3[],
  zone?: ZoneNode,
): RoutePath {
  const lifted = points.map((p) => liftPointToZoneFloor(p, zone));
  return {
    id,
    zoneId: zone?.id,
    zoneName: zone?.name,
    points: extendRoutePathEndpoints(lifted, ROUTE_ENDPOINT_EXTENSION_M).map(
      ([x, y, z]) => [x, y, Math.max(z, 0)] as Vec3,
    ),
  };
}

function collectZoneRoutePaths(zone: ZoneNode): RoutePath[] {
  const paths: RoutePath[] = [];
  const routeItemPositions: Vec3[] = [];

  for (const raw of zone.assets ?? []) {
    if (!isRouteAssetClass(raw.class)) continue;

    const listPoints = extractRouteListPoints(raw);
    if (listPoints) {
      if (routeItemPositions.length >= 2) {
        paths.push(finalizeRoutePath(`zone-${zone.id}-route-items`, routeItemPositions, zone));
        routeItemPositions.length = 0;
      }
      paths.push(finalizeRoutePath(raw.id, listPoints, zone));
      continue;
    }

    if (raw.position.length >= 3) {
      routeItemPositions.push(raw.position);
    }
  }

  if (routeItemPositions.length >= 2) {
    paths.push(finalizeRoutePath(`zone-${zone.id}-route-items`, routeItemPositions, zone));
  }

  return paths;
}

export function collectRoutePaths(doc: SceneGraphSkeleton): RoutePath[] {
  const paths: RoutePath[] = [];

  for (const node of doc.scene_graph.nodes) {
    if (node.type !== "ZONE") continue;
    paths.push(...collectZoneRoutePaths(node));
  }

  for (const raw of doc.scene_graph.assets ?? []) {
    if (!isRouteAssetClass(raw.class)) continue;
    const listPoints = extractRouteListPoints(raw);
    if (listPoints) paths.push(finalizeRoutePath(raw.id, listPoints));
  }

  return paths;
}

export function filterOutRouteAssets(assets: FacilityAssetRef[]): FacilityAssetRef[] {
  return assets.filter((asset) => !isRouteAssetClass(asset.class));
}
