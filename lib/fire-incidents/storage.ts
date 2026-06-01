import type { FireIncident } from "@/lib/fire-incidents/types";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

const STORAGE_PREFIX = "supersafetwin-fire-incidents:";
const LEGACY_STORAGE_PREFIX = "bimfree-fire-incidents:";

function storageKey(buildingId: string) {
  return `${STORAGE_PREFIX}${buildingId}`;
}

function legacyStorageKey(buildingId: string) {
  return `${LEGACY_STORAGE_PREFIX}${buildingId}`;
}

function isVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.slice(0, 3).every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function toVec3(value: unknown): Vec3 | null {
  if (isVec3(value)) {
    return [value[0], value[1], value[2]];
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (
    typeof raw.x === "number" &&
    Number.isFinite(raw.x) &&
    typeof raw.y === "number" &&
    Number.isFinite(raw.y) &&
    typeof raw.z === "number" &&
    Number.isFinite(raw.z)
  ) {
    return [raw.x, raw.y, raw.z];
  }

  return null;
}

function normalizeSeverity(value: unknown): FireIncident["severity"] {
  if (typeof value !== "string") return "high";

  const key = value.toLowerCase();
  if (key === "low" || key === "medium" || key === "high") {
    return key;
  }

  return "high";
}

function parseIncident(raw: unknown): FireIncident | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const position = toVec3(item.position);
  if (typeof item.id !== "string" || !position) return null;

  const status = typeof item.status === "string" ? item.status.toUpperCase() : "ACTIVE";
  if (status !== "ACTIVE") return null;

  return {
    id: item.id,
    position,
    severity: normalizeSeverity(item.severity),
    reported_at:
      typeof item.reported_at === "string"
        ? item.reported_at
        : typeof item.created_at === "string"
          ? item.created_at
          : new Date().toISOString(),
    ...(typeof item.note === "string" ? { note: item.note } : {}),
    ...(typeof item.reported_by === "string" ? { reported_by: item.reported_by } : {}),
    ...(typeof item.zone_id === "string"
      ? { zone_id: item.zone_id }
      : typeof item.target_node_id === "string"
        ? { zone_id: item.target_node_id }
        : {}),
    ...(typeof item.zone_name === "string" ? { zone_name: item.zone_name } : {}),
  };
}

function collectIncidentCandidates(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value);
  }

  return [];
}

export function loadFireIncidents(buildingId: string): FireIncident[] {
  if (typeof window === "undefined" || !buildingId) return [];

  try {
    const raw =
      localStorage.getItem(storageKey(buildingId)) ??
      localStorage.getItem(legacyStorageKey(buildingId));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.map(parseIncident).filter((item): item is FireIncident => Boolean(item));
  } catch {
    return [];
  }
}

export const FIRE_INCIDENTS_CHANGED_EVENT = "supersafetwin-fire-incidents-changed";

export function saveFireIncidents(buildingId: string, incidents: FireIncident[]): void {
  if (typeof window === "undefined" || !buildingId) return;

  localStorage.setItem(storageKey(buildingId), JSON.stringify(incidents));
  window.dispatchEvent(
    new CustomEvent(FIRE_INCIDENTS_CHANGED_EVENT, { detail: { buildingId } }),
  );
}

export function parseFireIncidentsFromSceneGraph(raw: unknown): FireIncident[] {
  if (Array.isArray(raw)) {
    return raw.map(parseIncident).filter((item): item is FireIncident => Boolean(item));
  }

  if (typeof raw !== "object" || raw === null) {
    return [];
  }

  const item = raw as Record<string, unknown>;
  const candidates: unknown[] = [];

  for (const key of ["fire_incidents", "incidents", "items"]) {
    candidates.push(...collectIncidentCandidates(item[key]));
  }

  const overlays = item.overlays;
  if (typeof overlays === "object" && overlays !== null) {
    const overlayRecord = overlays as Record<string, unknown>;
    for (const key of ["fire_incidents", "incidents", "items"]) {
      candidates.push(...collectIncidentCandidates(overlayRecord[key]));
    }
  }

  return candidates.map(parseIncident).filter((incident): incident is FireIncident => Boolean(incident));
}

export function resolveFireIncidents(
  buildingId: string | null | undefined,
  fromSceneGraph: FireIncident[],
): FireIncident[] {
  if (!buildingId) return fromSceneGraph;

  const stored = loadFireIncidents(buildingId);
  return stored.length > 0 ? stored : fromSceneGraph;
}

export function createFireIncident(
  position: Vec3,
  options?: {
    zoneId?: string;
    zoneName?: string;
    note?: string;
    reportedBy?: string;
    severity?: import("@/lib/fire-incidents/types").FireSeverity;
  },
): FireIncident {
  return {
    id: `fire-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    position,
    severity: options?.severity ?? "high",
    reported_at: new Date().toISOString(),
    ...(options?.note ? { note: options.note } : {}),
    ...(options?.reportedBy ? { reported_by: options.reportedBy } : {}),
    ...(options?.zoneId ? { zone_id: options.zoneId } : {}),
    ...(options?.zoneName ? { zone_name: options.zoneName } : {}),
  };
}
