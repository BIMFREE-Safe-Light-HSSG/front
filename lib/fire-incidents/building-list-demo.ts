import { getDemoSceneGraph, isDemoBuildingId } from "@/lib/facility-demo/seed";
import {
  parseFireIncidentsFromSceneGraph,
  resolveFireIncidents,
} from "@/lib/fire-incidents/storage";
import type { FireIncident } from "@/lib/fire-incidents/types";

function seedFireIncidents(buildingId: string): FireIncident[] {
  if (!isDemoBuildingId(buildingId)) return [];
  const graph = getDemoSceneGraph(buildingId);
  if (!graph) return [];
  return parseFireIncidentsFromSceneGraph(
    (graph.scene_graph as { fire_incidents?: unknown }).fire_incidents,
  );
}

/** 데모 건물: localStorage + 씬 그래프 시드 */
export function getResolvedFireIncidentsForBuilding(buildingId: string): FireIncident[] {
  return resolveFireIncidents(buildingId, seedFireIncidents(buildingId));
}
