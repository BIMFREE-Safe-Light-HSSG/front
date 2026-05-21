import type { UserJob } from "@/app/api/auth";
import {
  createBuildingFireIncident,
  deleteBuildingFireIncident,
  listBuildingFireIncidents,
} from "@/app/api/fire-incidents";
import { isDemoBuildingId } from "@/lib/facility-demo/seed";
import {
  createFireIncident,
  loadFireIncidents,
  parseFireIncidentsFromSceneGraph,
  resolveFireIncidents,
  saveFireIncidents,
  FIRE_INCIDENTS_CHANGED_EVENT,
} from "@/lib/fire-incidents/storage";
import type { FireIncident, FireSeverity } from "@/lib/fire-incidents/types";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

function dispatchFireChanged(buildingId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FIRE_INCIDENTS_CHANGED_EVENT, { detail: { buildingId } }),
  );
}

export function useDemoFireStorage(buildingId: string | null | undefined): boolean {
  return Boolean(buildingId && isDemoBuildingId(buildingId));
}

export async function fetchBuildingFireIncidents(
  buildingId: string,
  options: {
    accessToken: string | null;
    job: UserJob | null | undefined;
    sceneGraphSeed?: unknown;
  },
): Promise<FireIncident[]> {
  const seed = parseFireIncidentsFromSceneGraph(options.sceneGraphSeed);

  if (useDemoFireStorage(buildingId)) {
    return resolveFireIncidents(buildingId, seed);
  }

  if (!options.accessToken) {
    return seed;
  }

  try {
    return await listBuildingFireIncidents(options.accessToken, buildingId, options.job);
  } catch {
    return seed;
  }
}

export async function registerBuildingFireIncident(
  buildingId: string,
  options: {
    accessToken: string | null;
    position: Vec3;
    severity: FireSeverity;
    note?: string;
    zoneId?: string;
    zoneName?: string;
    reportedBy?: string;
  },
): Promise<FireIncident> {
  if (useDemoFireStorage(buildingId)) {
    const next = createFireIncident(options.position, {
      zoneId: options.zoneId,
      zoneName: options.zoneName,
      note: options.note,
      reportedBy: options.reportedBy,
      severity: options.severity,
    });
    const current = loadFireIncidents(buildingId);
    saveFireIncidents(buildingId, [...current, next]);
    dispatchFireChanged(buildingId);
    return next;
  }

  if (!options.accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const created = await createBuildingFireIncident(options.accessToken, buildingId, {
    position: options.position,
    severity: options.severity,
    note: options.note,
    zone_id: options.zoneId,
    zone_name: options.zoneName,
  });
  dispatchFireChanged(buildingId);
  return created;
}

export async function removeBuildingFireIncident(
  buildingId: string,
  incidentId: string,
  options: { accessToken: string | null },
): Promise<void> {
  if (useDemoFireStorage(buildingId)) {
    const current = loadFireIncidents(buildingId).filter((item) => item.id !== incidentId);
    saveFireIncidents(buildingId, current);
    dispatchFireChanged(buildingId);
    return;
  }

  if (!options.accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  await deleteBuildingFireIncident(options.accessToken, buildingId, incidentId);
  dispatchFireChanged(buildingId);
}
