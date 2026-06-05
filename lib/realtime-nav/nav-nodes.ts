import type { Vec3, ZoneNode } from "@/lib/scene-graph-skeleton/types";

import { fetchNavNodes, type NavNodeSummary } from "@/lib/realtime-nav/api";

const NAV_ROOM_TYPES = new Set(["room", "corridor"]);

let cachedNavRooms: NavNodeSummary[] | null = null;

export async function fetchNavRoomNodes(): Promise<NavNodeSummary[]> {
  if (cachedNavRooms) return cachedNavRooms;

  const nodes = await fetchNavNodes();
  cachedNavRooms = nodes.filter(
    (node) =>
      NAV_ROOM_TYPES.has(String(node.type ?? "").toLowerCase()) &&
      Array.isArray(node.center) &&
      node.center.length >= 3,
  );
  return cachedNavRooms;
}

export function clearNavRoomCache() {
  cachedNavRooms = null;
}

function dist2(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

export function nearestNavNode(
  position: Vec3,
  nodes: NavNodeSummary[],
): NavNodeSummary | null {
  let best: NavNodeSummary | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const center = node.center;
    if (!center || center.length < 3) continue;
    const d = dist2(position, center as Vec3);
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }

  return best;
}

export function nearestNavNodeToZone(
  zone: ZoneNode,
  nodes: NavNodeSummary[],
): NavNodeSummary | null {
  return nearestNavNode(zone.geometry.center, nodes);
}

export function navNodeById(
  nodeId: string,
  nodes: NavNodeSummary[],
): NavNodeSummary | null {
  return nodes.find((node) => node.id === nodeId) ?? null;
}
