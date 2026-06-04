import type { Occupant } from "@/lib/occupants/types";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

const OCCUPANT_TYPES = new Set([
  "OCCUPANT",
  "OCCUPANTS",
  "OCCPUANT",
  "OCCPUANTS",
  "PERSON",
  "HUMAN",
]);

const FIRE_TYPES = new Set(["FIRE", "INCIDENT"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toVec3(value: unknown): Vec3 | null {
  if (Array.isArray(value) && value.length >= 3) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    const z = Number(value[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return [x, y, z];
    }
    return null;
  }

  if (!isRecord(value)) return null;

  if (Array.isArray(value.position) && value.position.length >= 3) {
    const x = Number(value.position[0]);
    const y = Number(value.position[1]);
    const z = Number(value.position[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return [x, y, z];
    }
  }

  if (
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y) &&
    typeof value.z === "number" &&
    Number.isFinite(value.z)
  ) {
    return [value.x, value.y, value.z];
  }

  return null;
}

function overlayTypeKey(raw: unknown): string | undefined {
  if (!isRecord(raw) || typeof raw.type !== "string") return undefined;
  return raw.type.trim().toUpperCase();
}

export function isOccupantOverlayType(type: string): boolean {
  return OCCUPANT_TYPES.has(type.trim().toUpperCase());
}

export function isFireOverlayType(type: string): boolean {
  return FIRE_TYPES.has(type.trim().toUpperCase());
}

function collectOverlayCandidates(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) return Object.values(value);
  return [];
}

function parseOccupant(raw: unknown, assumeOccupant = false): Occupant | null {
  if (!isRecord(raw)) return null;

  const typeKey = overlayTypeKey(raw);
  if (typeKey) {
    if (isFireOverlayType(typeKey)) return null;
    if (!assumeOccupant && !isOccupantOverlayType(typeKey)) return null;
  } else if (!assumeOccupant) {
    return null;
  }

  const position = toVec3(raw.position ?? raw);
  if (typeof raw.id !== "string" || !position) return null;

  const status = typeof raw.status === "string" ? raw.status.toUpperCase() : "ACTIVE";
  if (status !== "ACTIVE") return null;

  return {
    id: raw.id,
    position,
    ...(typeof raw.zone_id === "string"
      ? { zone_id: raw.zone_id }
      : typeof raw.target_node_id === "string"
        ? { zone_id: raw.target_node_id }
        : {}),
    ...(typeof raw.zone_name === "string" ? { zone_name: raw.zone_name } : {}),
    ...(typeof raw.label === "string"
      ? { label: raw.label }
      : typeof raw.name === "string"
        ? { label: raw.name }
        : {}),
  };
}

function ingestOccupants(
  parsed: Occupant[],
  seen: Set<string>,
  list: unknown[],
  assumeOccupant: boolean,
) {
  for (const item of list) {
    const occupant = parseOccupant(item, assumeOccupant);
    if (!occupant || seen.has(occupant.id)) continue;
    seen.add(occupant.id);
    parsed.push(occupant);
  }
}

/** scene graph overlays.occupants 등에서 재실자(occupant)만 추출 */
export function parseOccupantsFromSceneGraph(raw: unknown): Occupant[] {
  const parsed: Occupant[] = [];
  const seen = new Set<string>();

  if (Array.isArray(raw)) {
    ingestOccupants(parsed, seen, raw, false);
    return parsed;
  }

  if (!isRecord(raw)) return [];

  for (const key of ["occupants", "occupant", "occpuants", "occpuant"]) {
    ingestOccupants(parsed, seen, collectOverlayCandidates(raw[key]), true);
  }

  ingestOccupants(parsed, seen, collectOverlayCandidates(raw.items), false);

  const overlays = raw.overlays;
  if (isRecord(overlays)) {
    for (const key of ["occupants", "occupant", "occpuants", "occpuant"]) {
      ingestOccupants(parsed, seen, collectOverlayCandidates(overlays[key]), true);
    }

    ingestOccupants(parsed, seen, collectOverlayCandidates(overlays.items), false);
  }

  return parsed;
}
