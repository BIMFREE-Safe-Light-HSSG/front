import type { FireIncident } from "@/lib/fire-incidents/types";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

const STORAGE_PREFIX = "bimfree-fire-incidents:";

function storageKey(buildingId: string) {
  return `${STORAGE_PREFIX}${buildingId}`;
}

function isVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.slice(0, 3).every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function parseIncident(raw: unknown): FireIncident | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== "string" || !isVec3(item.position)) return null;

  const severity =
    item.severity === "low" || item.severity === "medium" || item.severity === "high"
      ? item.severity
      : "high";

  return {
    id: item.id,
    position: [item.position[0], item.position[1], item.position[2]],
    severity,
    reported_at: typeof item.reported_at === "string" ? item.reported_at : new Date().toISOString(),
    ...(typeof item.note === "string" ? { note: item.note } : {}),
    ...(typeof item.reported_by === "string" ? { reported_by: item.reported_by } : {}),
    ...(typeof item.zone_id === "string" ? { zone_id: item.zone_id } : {}),
    ...(typeof item.zone_name === "string" ? { zone_name: item.zone_name } : {}),
  };
}

export function loadFireIncidents(buildingId: string): FireIncident[] {
  if (typeof window === "undefined" || !buildingId) return [];

  try {
    const raw = localStorage.getItem(storageKey(buildingId));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.map(parseIncident).filter((item): item is FireIncident => Boolean(item));
  } catch {
    return [];
  }
}

export const FIRE_INCIDENTS_CHANGED_EVENT = "bimfree-fire-incidents-changed";

export function saveFireIncidents(buildingId: string, incidents: FireIncident[]): void {
  if (typeof window === "undefined" || !buildingId) return;

  localStorage.setItem(storageKey(buildingId), JSON.stringify(incidents));
  window.dispatchEvent(
    new CustomEvent(FIRE_INCIDENTS_CHANGED_EVENT, { detail: { buildingId } }),
  );
}

export function parseFireIncidentsFromSceneGraph(raw: unknown): FireIncident[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseIncident).filter((item): item is FireIncident => Boolean(item));
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
