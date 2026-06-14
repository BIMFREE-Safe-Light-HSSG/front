import { findZoneForAssetPosition } from "@/lib/scene-graph-skeleton/assets";
import type { FireIncident } from "@/lib/fire-incidents/types";
import type { Occupant } from "@/lib/occupants/types";
import type { RoutePath } from "@/lib/scene-graph-skeleton/route-assets";
import type { FacilityAssetRef, Vec3, ZoneNode } from "@/lib/scene-graph-skeleton/types";

export type BuildingFloor = {
  id: string;
  name: string;
  zoneIds: ReadonlySet<string>;
  zMin?: number;
  zMax?: number;
};

export type FloorCatalog = {
  floors: BuildingFloor[];
  zoneToFloorId: ReadonlyMap<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFloorNode(raw: unknown): BuildingFloor | null {
  if (!isRecord(raw) || raw.type !== "FLOOR" || typeof raw.id !== "string") {
    return null;
  }

  const zoneIds = Array.isArray(raw.zones)
    ? raw.zones.filter((zoneId): zoneId is string => typeof zoneId === "string")
    : [];

  let zMin: number | undefined;
  let zMax: number | undefined;
  const geometry = raw.geometry;
  if (isRecord(geometry) && Array.isArray(geometry.z_range) && geometry.z_range.length >= 2) {
    const min = Number(geometry.z_range[0]);
    const max = Number(geometry.z_range[1]);
    if (Number.isFinite(min)) zMin = min;
    if (Number.isFinite(max)) zMax = max;
  }

  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name : raw.id,
    zoneIds: new Set(zoneIds),
    ...(zMin !== undefined ? { zMin } : {}),
    ...(zMax !== undefined ? { zMax } : {}),
  };
}

function inferFloorIdFromZoneId(zoneId: string, floors: BuildingFloor[]): string | undefined {
  const match = zoneId.match(/_(\d+F)(?:_|$)/i);
  if (!match) return undefined;

  const token = match[1]!.toUpperCase();
  return floors.find((floor) => floor.id.toUpperCase().includes(token))?.id;
}

/** scene_graph.nodes에서 FLOOR 노드 파싱 */
export function parseFloorCatalog(rawNodes: unknown[]): FloorCatalog | null {
  const floors = rawNodes
    .map(parseFloorNode)
    .filter((floor): floor is BuildingFloor => Boolean(floor))
    .sort((a, b) => (a.zMin ?? 0) - (b.zMin ?? 0));

  if (floors.length === 0) return null;

  const zoneToFloorId = new Map<string, string>();
  for (const floor of floors) {
    for (const zoneId of floor.zoneIds) {
      zoneToFloorId.set(zoneId, floor.id);
    }
  }

  return { floors, zoneToFloorId };
}

export function resolveZoneFloorId(
  zoneId: string,
  catalog: FloorCatalog,
): string | undefined {
  return catalog.zoneToFloorId.get(zoneId) ?? inferFloorIdFromZoneId(zoneId, catalog.floors);
}

export function filterZonesByFloor(
  zones: ZoneNode[],
  catalog: FloorCatalog,
  floorId: string | null,
): ZoneNode[] {
  if (!floorId) return zones;
  return zones.filter((zone) => resolveZoneFloorId(zone.id, catalog) === floorId);
}

export function defaultFloorId(
  catalog: FloorCatalog,
  options?: { singleFloorDefault?: boolean },
): string | null {
  if (catalog.floors.length <= 1) {
    return catalog.floors[0]?.id ?? null;
  }
  return options?.singleFloorDefault ? catalog.floors[0]!.id : null;
}

function positionOnFloor(
  position: Vec3,
  zones: ZoneNode[],
  catalog: FloorCatalog,
  floorId: string,
): boolean {
  const match = findZoneForAssetPosition(zones, position);
  if (!match) return false;
  return resolveZoneFloorId(match.zoneId, catalog) === floorId;
}

export function filterAssetsByFloor(
  assets: FacilityAssetRef[],
  zones: ZoneNode[],
  catalog: FloorCatalog,
  floorId: string | null,
): FacilityAssetRef[] {
  if (!floorId) return assets;

  return assets.filter((asset) => {
    if (asset.zoneId) {
      return resolveZoneFloorId(asset.zoneId, catalog) === floorId;
    }
    return positionOnFloor(asset.position, zones, catalog, floorId);
  });
}

export function filterFireIncidentsByFloor(
  incidents: readonly FireIncident[],
  zones: ZoneNode[],
  catalog: FloorCatalog,
  floorId: string | null,
): FireIncident[] {
  if (!floorId) return [...incidents];

  return incidents.filter((incident) =>
    positionOnFloor(incident.position, zones, catalog, floorId),
  );
}

export function filterOccupantsByFloor(
  occupants: Occupant[],
  zones: ZoneNode[],
  catalog: FloorCatalog,
  floorId: string | null,
): Occupant[] {
  if (!floorId) return occupants;

  return occupants.filter((occupant) =>
    positionOnFloor(occupant.position, zones, catalog, floorId),
  );
}

export function filterRoutePathsByFloor(
  paths: RoutePath[],
  zones: ZoneNode[],
  catalog: FloorCatalog,
  floorId: string | null,
): RoutePath[] {
  if (!floorId) return paths;

  return paths.filter((path) =>
    path.points.some((point) => positionOnFloor(point, zones, catalog, floorId)),
  );
}

export function filterZoneIdSetByFloor(
  zoneIds: ReadonlySet<string>,
  catalog: FloorCatalog,
  floorId: string | null,
): Set<string> {
  if (!floorId) return new Set(zoneIds);

  const filtered = new Set<string>();
  for (const zoneId of zoneIds) {
    if (resolveZoneFloorId(zoneId, catalog) === floorId) {
      filtered.add(zoneId);
    }
  }
  return filtered;
}
