import type { CreatedBuilding, ViewerBuilding } from "@/app/api/viewer";

export function createdBuildingToViewer(building: CreatedBuilding): ViewerBuilding {
  return {
    ...building,
    has_scene_graph: false,
    latest_graph_created_at: null,
  };
}
