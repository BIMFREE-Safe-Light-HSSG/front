import axios from "axios";
import type { BuildingLocationPayload } from "@/app/api/auth";
import { apiUrl } from "@/lib/api/client";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

/** FRONT.md — BuildingSummaryResponse */
export type ViewerBuilding = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  district_code: string | null;
  district_name: string | null;
  region_1depth_name?: string | null;
  region_2depth_name?: string | null;
  region_3depth_name?: string | null;
  has_scene_graph: boolean;
  latest_graph_created_at: string | null;
  active_fire_count?: number;
};

export type SceneGraph = {
  building_id: string;
  building_name: string;
  graph_data_id: string;
  created_at: string;
  scene_graph: {
    nodes?: unknown[];
    edges?: unknown[];
    [key: string]: unknown;
  };
};

export type SceneGraphPositionPayload = {
  x: number;
  y: number;
  z: number;
};

export type SceneGraphMutation =
  | {
      type: "ADD_NODE";
      payload: {
        node: {
          type: "facility";
          label: string;
          position: SceneGraphPositionPayload;
          metadata?: Record<string, unknown>;
        };
      };
    }
  | {
      type: "REMOVE_NODE";
      payload:
        | {
            node_id: string;
          }
        | {
            node: {
              id: string;
            };
          }
        | {
            id: string;
          };
    }
  | {
      type: "UPDATE_NODE";
      payload: {
        node: {
          id: string;
          [key: string]: unknown;
        };
      };
    }
  | {
      type: "ADD_OVERLAY";
      payload: {
        overlay_type: "incidents" | string;
        overlay: Record<string, unknown>;
      };
    }
  | {
      type: "REMOVE_OVERLAY";
      payload: {
        overlay_type: "incidents" | string;
        overlay_id: string;
      };
    };

/** FRONT.md에 workspace API 없음 — 클라이언트에서 조합 */
export type ViewerBootstrap = {
  buildings: ViewerBuilding[];
  default_building_id: string | null;
  default_scene_graph: SceneGraph | null;
};

export type CreatedBuilding = {
  id: string;
  name: string;
  address: string | null;
  provider?: string | null;
  provider_place_id?: string | null;
  latitude: number;
  longitude: number;
  district_code: string | null;
  district_name: string | null;
  region_1depth_name?: string | null;
  region_2depth_name?: string | null;
  region_3depth_name?: string | null;
};

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export function vec3ToSceneGraphPosition([x, y, z]: Vec3): SceneGraphPositionPayload {
  return { x, y, z };
}

/** GET /buildings — 시설·소방 공통, 서버가 역할별 필터링 */
export const getBuildings = async (accessToken: string): Promise<ViewerBuilding[]> => {
  const response = await axios.get<ViewerBuilding[]>(apiUrl("/buildings"), {
    headers: authHeaders(accessToken),
  });

  return response.data;
};

/** GET /buildings/{building_id}/scene-graph */
export const getBuildingSceneGraph = async (
  accessToken: string,
  buildingId: string,
): Promise<SceneGraph> => {
  const response = await axios.get<SceneGraph>(
    apiUrl(`/buildings/${buildingId}/scene-graph`),
    {
      headers: authHeaders(accessToken),
    },
  );

  return response.data;
};

/** POST /buildings/{building_id}/scene-graph/mutations */
export const applySceneGraphMutations = async ({
  accessToken,
  buildingId,
  baseGraphDataId,
  mutations,
}: {
  accessToken: string;
  buildingId: string;
  baseGraphDataId: string;
  mutations: SceneGraphMutation[];
}): Promise<SceneGraph> => {
  const response = await axios.post<SceneGraph>(
    apiUrl(`/buildings/${buildingId}/scene-graph/mutations`),
    {
      base_graph_data_id: baseGraphDataId,
      mutations,
    },
    {
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

/** 워크스페이스 초기 데이터 — FRONT.md 권장 플로우 기반 */
export const getWorkspace = async (accessToken: string): Promise<ViewerBootstrap> => {
  const buildings = await getBuildings(accessToken);
  const defaultBuilding =
    buildings.find((building) => building.has_scene_graph) ?? buildings[0] ?? null;

  let default_scene_graph: SceneGraph | null = null;
  if (defaultBuilding?.has_scene_graph) {
    try {
      default_scene_graph = await getBuildingSceneGraph(accessToken, defaultBuilding.id);
    } catch {
      default_scene_graph = null;
    }
  }

  return {
    buildings,
    default_building_id: defaultBuilding?.id ?? null,
    default_scene_graph,
  };
};

/** POST /facility/buildings */
export const createBuilding = async ({
  accessToken,
  payload,
}: {
  accessToken: string;
  payload: BuildingLocationPayload;
}): Promise<CreatedBuilding> => {
  const response = await axios.post<CreatedBuilding>(apiUrl("/facility/buildings"), payload, {
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
  });

  return response.data;
};
