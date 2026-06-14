import { findZoneForAssetPosition } from "@/lib/scene-graph-skeleton/assets";
import type { Vec3, ZoneNode } from "@/lib/scene-graph-skeleton/types";

import type { NavNodeSummary } from "@/lib/realtime-nav/api";
import { navNodeById } from "@/lib/realtime-nav/nav-nodes";

function nearestZoneId(zones: ZoneNode[], position: Vec3): string | null {
  const match = findZoneForAssetPosition(zones, position);
  if (match) return match.zoneId;

  let bestId: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const zone of zones) {
    const center = zone.geometry.center;
    const dx = center[0] - position[0];
    const dy = center[1] - position[1];
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = zone.id;
    }
  }

  return bestId;
}

/** nav graph fire_nodes → scene zone IDs (확산 구역 3D 표시용) */
export function fireSpreadToZoneIds(
  fireNodes: Record<string, number>,
  zones: ZoneNode[],
  navNodes: NavNodeSummary[],
): Set<string> {
  const zoneIdSet = new Set(zones.map((zone) => zone.id));
  const spreadZoneIds = new Set<string>();

  for (const nodeId of Object.keys(fireNodes)) {
    if (zoneIdSet.has(nodeId)) {
      spreadZoneIds.add(nodeId);
      continue;
    }

    const navNode = navNodeById(nodeId, navNodes);
    const center = navNode?.center;
    if (!center || center.length < 3) continue;

    const zoneId = nearestZoneId(zones, center as Vec3);
    if (zoneId) spreadZoneIds.add(zoneId);
  }

  return spreadZoneIds;
}
