import type { FireIncident } from "@/lib/fire-incidents/types";
import type { Occupant, OccupantRole } from "@/lib/occupants/types";
import type { Vec3, ZoneNode } from "@/lib/scene-graph-skeleton/types";

import type { NavNodeSummary } from "@/lib/realtime-nav/api";
import { nearestNavNode, nearestNavNodeToZone, navNodeById } from "@/lib/realtime-nav/nav-nodes";

export type NavSessionNodes = {
  fire_node: string;
  rescuer_node: string;
  victim_node: string;
};

export function resolveOccupantRole(occupant: Occupant): OccupantRole {
  if (occupant.role) return occupant.role;

  const label = occupant.label?.toLowerCase() ?? "";
  if (label.includes("피해자") || label.includes("victim")) return "victim";
  if (label.includes("소방") || label.includes("구조") || label.includes("rescuer")) {
    return "rescuer";
  }
  return "other";
}

function pickFireNode(
  fireIncidents: FireIncident[],
  navRooms: NavNodeSummary[],
): string | null {
  const incident = fireIncidents[0];
  if (!incident) return null;

  if (incident.zone_id && navNodeById(incident.zone_id, navRooms)) {
    return incident.zone_id;
  }

  return nearestNavNode(incident.position, navRooms)?.id ?? null;
}

function pickVictimNode(
  occupants: Occupant[],
  navRooms: NavNodeSummary[],
  excludeNodeIds: Set<string>,
): string | null {
  const byRole =
    occupants.find((o) => resolveOccupantRole(o) === "victim") ??
    occupants.find((o) => resolveOccupantRole(o) === "other") ??
    occupants[0];

  if (!byRole) return null;

  const node = nearestNavNode(byRole.position, navRooms);
  if (!node || excludeNodeIds.has(node.id)) {
    const alt = navRooms.find((room) => !excludeNodeIds.has(room.id));
    return alt?.id ?? null;
  }
  return node.id;
}

function pickRescuerNode(
  navRooms: NavNodeSummary[],
  rescuerNodeId: string | null | undefined,
  zones: ZoneNode[],
  rescuerZoneId: string | null | undefined,
  occupants: Occupant[],
): string | null {
  if (rescuerNodeId && navNodeById(rescuerNodeId, navRooms)) {
    return rescuerNodeId;
  }

  if (rescuerZoneId) {
    const zone = zones.find((item) => item.id === rescuerZoneId);
    if (zone) {
      return nearestNavNodeToZone(zone, navRooms)?.id ?? null;
    }
  }

  const rescuerOccupant = occupants.find((o) => resolveOccupantRole(o) === "rescuer");
  if (rescuerOccupant) {
    return nearestNavNode(rescuerOccupant.position, navRooms)?.id ?? null;
  }

  return null;
}

export function buildNavSessionFromScene(input: {
  fireIncidents: FireIncident[];
  occupants: Occupant[];
  zones: ZoneNode[];
  navRooms: NavNodeSummary[];
  rescuerNodeId?: string | null;
  rescuerZoneId?: string | null;
  victimNodeId?: string | null;
}): NavSessionNodes | null {
  const fireNode = pickFireNode(input.fireIncidents, input.navRooms);
  if (!fireNode) return null;

  const rescuerNode = pickRescuerNode(
    input.navRooms,
    input.rescuerNodeId,
    input.zones,
    input.rescuerZoneId,
    input.occupants,
  );
  if (!rescuerNode) return null;

  const victimNode =
    input.victimNodeId && navNodeById(input.victimNodeId, input.navRooms)
      ? input.victimNodeId
      : pickVictimNode(input.occupants, input.navRooms, new Set([fireNode, rescuerNode]));
  if (!victimNode) return null;

  return {
    fire_node: fireNode,
    rescuer_node: rescuerNode,
    victim_node: victimNode,
  };
}

export function zoneCenter(zone: ZoneNode): Vec3 {
  return zone.geometry.center;
}
