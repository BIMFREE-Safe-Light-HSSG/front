import axios from "axios";
import type { BuildingLocationPayload, UserJob } from "@/app/api/auth";
import { apiUrl } from "@/lib/api/client";

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

const workspacePrefix = (job: UserJob | null | undefined) => {
  return job === "FIREFIGHTER" ? "/emergency" : "/facility";
};

export const getWorkspace = async (
  accessToken: string,
  job: UserJob | null | undefined
): Promise<ViewerBootstrap> => {
  const response = await axios.get(apiUrl(`${workspacePrefix(job)}/workspace`), {
    headers: authHeaders(accessToken),
  });

  return response.data;
};

export const getBuildingSceneGraph = async (
  accessToken: string,
  buildingId: string,
  job: UserJob | null | undefined
): Promise<SceneGraph> => {
  const response = await axios.get(apiUrl(`${workspacePrefix(job)}/buildings/${buildingId}/scene-graph`), {
    headers: authHeaders(accessToken),
  });

  return response.data;
};

export const getBuildings = async (
  accessToken: string,
  job: UserJob | null | undefined
): Promise<ViewerBuilding[]> => {
  const response = await axios.get(apiUrl(`${workspacePrefix(job)}/buildings`), {
    headers: authHeaders(accessToken),
  });

  return response.data;
};

export const createBuilding = async ({
  accessToken,
  payload,
}: {
  accessToken: string;
  payload: BuildingLocationPayload;
}): Promise<CreatedBuilding> => {
  const response = await axios.post(apiUrl("/facility/buildings"), payload, {
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
  });

  return response.data;
};
