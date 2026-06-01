import type { FireNotification } from "@/app/api/fire-incidents";
import {
  getBuildingSceneGraph,
  type SceneGraph,
  type ViewerBuilding,
} from "@/app/api/viewer";
import { getDemoSceneGraph, isDemoBuildingId } from "@/lib/facility-demo/seed";
import { parseFireIncidentsFromSceneGraph } from "@/lib/fire-incidents/storage";
import type { FireIncident, FireSeverity } from "@/lib/fire-incidents/types";

const READ_STORAGE_PREFIX = "supersafetwin-fire-notification-reads:";
const LEGACY_READ_STORAGE_PREFIX = "bimfree-fire-notification-reads:";

const SEVERITY_LABEL: Record<FireSeverity, string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};

export type SceneGraphFirePollResult = {
  notifications: FireNotification[];
  fireCountsByBuildingId: Record<string, number>;
  sceneGraphsByBuildingId: Record<string, SceneGraph>;
};

function readStorageKey(scope: string) {
  return `${READ_STORAGE_PREFIX}${scope}`;
}

function legacyReadStorageKey(scope: string) {
  return `${LEGACY_READ_STORAGE_PREFIX}${scope}`;
}

function loadReadMap(scope: string): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw =
      localStorage.getItem(readStorageKey(scope)) ??
      localStorage.getItem(legacyReadStorageKey(scope));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === "string",
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveReadMap(scope: string, readMap: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(readStorageKey(scope), JSON.stringify(readMap));
}

export function markSceneGraphFireNotificationRead(scope: string, notificationId: string) {
  const readMap = loadReadMap(scope);
  readMap[notificationId] = new Date().toISOString();
  saveReadMap(scope, readMap);
}

function notificationId(buildingId: string, incidentId: string) {
  return `${buildingId}:${incidentId}`;
}

function buildNotification(
  building: ViewerBuilding,
  incident: FireIncident,
  readMap: Record<string, string>,
): FireNotification {
  const id = notificationId(building.id, incident.id);
  const zoneText = incident.zone_name ?? "구역 미지정";
  const severityText = SEVERITY_LABEL[incident.severity] ?? "높음";

  return {
    id,
    fire_incident_id: incident.id,
    building_id: building.id,
    building_name: building.name,
    title: `${building.name} 화재 발생`,
    body: `${zoneText} · 위험도 ${severityText}`,
    read_at: readMap[id] ?? null,
    created_at: incident.reported_at,
  };
}

function sortNotifications(items: FireNotification[]) {
  return [...items].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}

async function loadSceneGraphForBuilding(
  accessToken: string,
  building: ViewerBuilding,
): Promise<SceneGraph | null> {
  if (isDemoBuildingId(building.id)) {
    return getDemoSceneGraph(building.id);
  }

  if (!building.has_scene_graph) {
    return null;
  }

  return getBuildingSceneGraph(accessToken, building.id);
}

export async function pollSceneGraphFireNotifications({
  accessToken,
  buildings,
  readScope,
}: {
  accessToken: string;
  buildings: ViewerBuilding[];
  readScope: string;
}): Promise<SceneGraphFirePollResult> {
  const readMap = loadReadMap(readScope);
  const fireCountsByBuildingId: Record<string, number> = {};
  const sceneGraphsByBuildingId: Record<string, SceneGraph> = {};
  const notifications: FireNotification[] = [];

  const settled = await Promise.allSettled(
    buildings.map(async (building) => ({
      building,
      sceneGraph: await loadSceneGraphForBuilding(accessToken, building),
    })),
  );

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;

    const { building, sceneGraph } = result.value;
    if (!sceneGraph) {
      fireCountsByBuildingId[building.id] = 0;
      continue;
    }

    sceneGraphsByBuildingId[building.id] = sceneGraph;

    const incidents = parseFireIncidentsFromSceneGraph(sceneGraph.scene_graph);
    fireCountsByBuildingId[building.id] = incidents.length;
    notifications.push(
      ...incidents.map((incident) => buildNotification(building, incident, readMap)),
    );
  }

  return {
    notifications: sortNotifications(notifications),
    fireCountsByBuildingId,
    sceneGraphsByBuildingId,
  };
}
