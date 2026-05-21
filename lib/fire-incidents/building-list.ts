import type { ViewerBuilding } from "@/app/api/viewer";
import { isDemoBuildingId } from "@/lib/facility-demo/seed";
import { getResolvedFireIncidentsForBuilding } from "@/lib/fire-incidents/building-list-demo";

export function getBuildingActiveFireCount(building: ViewerBuilding): number {
  if (typeof building.active_fire_count === "number") {
    return building.active_fire_count;
  }
  if (isDemoBuildingId(building.id)) {
    return getResolvedFireIncidentsForBuilding(building.id).length;
  }
  return 0;
}

export function buildingHasFireIncidents(building: ViewerBuilding): boolean {
  return getBuildingActiveFireCount(building) > 0;
}

/** 화재가 있는 건물을 위로, 동일 그룹 내에서는 화재 건수 많은 순 (API·데모 공통) */
export function sortBuildingsByFirePriority(buildings: ViewerBuilding[]): ViewerBuilding[] {
  return [...buildings].sort((a, b) => {
    const aCount = getBuildingActiveFireCount(a);
    const bCount = getBuildingActiveFireCount(b);
    if (aCount > 0 && bCount === 0) return -1;
    if (aCount === 0 && bCount > 0) return 1;
    if (aCount !== bCount) return bCount - aCount;
    return 0;
  });
}

export { getResolvedFireIncidentsForBuilding } from "@/lib/fire-incidents/building-list-demo";
