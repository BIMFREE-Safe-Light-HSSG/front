import type { AuthUser } from "@/app/api/auth";

import type { SceneGraph, ViewerBootstrap, ViewerBuilding } from "@/app/api/viewer";



import demoSkeleton from "@/lib/facility-demo/scene-graph-skeleton.json";

import demoSkeleton2 from "@/lib/facility-demo/scene_graph_2.json";

import demoSkeleton3 from "@/lib/facility-demo/sg_3.json";



export const DEMO_FACILITY_BUILDING_ID = "demo-bld-001";

export const DEMO_FACILITY_BUILDING_ID_2 = "demo-bld-002";

export const DEMO_FACILITY_BUILDING_ID_3 = "demo-bld-003";



const DEFAULT_DEMO_EMAILS = ["demo@supersafetwin.local"] as const;



type DemoSkeletonFile = {

  building_id?: string;

  scene_graph: SceneGraph["scene_graph"];

};



type DemoBuildingDef = {

  id: string;

  graphDataId: string;

  name: string;

  address: string;

  skeleton: DemoSkeletonFile;

};



const DEMO_BUILDINGS: DemoBuildingDef[] = [

  {

    id: DEMO_FACILITY_BUILDING_ID,

    graphDataId: "demo-graph-001",

    name: "BLD_001 데모 시설",

    address: "서울특별시 중구 (데모 · skeleton)",

    skeleton: demoSkeleton as DemoSkeletonFile,

  },

  {

    id: DEMO_FACILITY_BUILDING_ID_2,

    graphDataId: "demo-graph-002",

    name: "BLD_001 추출 데모 (scene_graph_2)",

    address: "서울특별시 중구 (데모 · scene_graph_2)",

    skeleton: demoSkeleton2 as DemoSkeletonFile,

  },

  {

    id: DEMO_FACILITY_BUILDING_ID_3,

    graphDataId: "demo-graph-003",

    name: "BLD_001 (sg_3 · 점검 이력)",

    address: "서울특별시 중구 (데모 · sg_3.json)",

    skeleton: demoSkeleton3 as DemoSkeletonFile,

  },

];



const parseMatchers = (value: string | undefined) =>

  value

    ?.split(",")

    .map((entry) => entry.trim().toLowerCase())

    .filter(Boolean) ?? [];



const configuredEmails = () => parseMatchers(process.env.NEXT_PUBLIC_DEMO_FACILITY_USER_EMAIL);



const configuredEmergencyEmails = () =>

  parseMatchers(process.env.NEXT_PUBLIC_DEMO_EMERGENCY_USER_EMAIL);



const configuredIds = () => parseMatchers(process.env.NEXT_PUBLIC_DEMO_FACILITY_USER_ID);



const configuredEmergencyIds = () => parseMatchers(process.env.NEXT_PUBLIC_DEMO_EMERGENCY_USER_ID);



function workspaceDemoEmails() {

  const emergency = configuredEmergencyEmails();

  if (emergency.length > 0) {

    return emergency;

  }



  return configuredEmails();

}



function workspaceDemoIds() {

  const emergency = configuredEmergencyIds();

  if (emergency.length > 0) {

    return emergency;

  }



  return configuredIds();

}



/** 시설·소방 워크스페이스 공통 데모 건물 */

export function isDemoWorkspaceUser(user: AuthUser | null | undefined): boolean {

  if (!user) {

    return false;

  }



  const email = user.email.trim().toLowerCase();

  const id = user.id.trim().toLowerCase();

  const emails = workspaceDemoEmails();

  const ids = workspaceDemoIds();



  if (emails.length > 0 && emails.includes(email)) {

    return true;

  }



  if (ids.length > 0 && ids.includes(id)) {

    return true;

  }



  if (emails.length === 0 && ids.length === 0) {

    return DEFAULT_DEMO_EMAILS.includes(email as (typeof DEFAULT_DEMO_EMAILS)[number]);

  }



  return false;

}



export function isDemoFacilityUser(user: AuthUser | null | undefined): boolean {

  return user?.job === "FACILITY_MANAGER" && isDemoWorkspaceUser(user);

}



export function isDemoBuildingId(buildingId: string) {

  return DEMO_BUILDINGS.some((demo) => demo.id === buildingId);

}



/** @deprecated use isDemoBuildingId */

export function isDemoFacilityBuildingId(buildingId: string) {

  return isDemoBuildingId(buildingId);

}



function demoDef(buildingId: string): DemoBuildingDef | undefined {

  return DEMO_BUILDINGS.find((demo) => demo.id === buildingId);

}



export function getDemoBuilding(buildingId: string): ViewerBuilding | null {

  const def = demoDef(buildingId);

  if (!def) {

    return null;

  }



  return {

    id: def.id,

    name: def.name,

    address: def.address,

    latitude: 37.5665,

    longitude: 126.978,

    district_code: null,

    district_name: "데모",

    region_1depth_name: "서울특별시",

    region_2depth_name: "중구",

    region_3depth_name: null,

    has_scene_graph: true,

    latest_graph_created_at: new Date().toISOString(),

  };

}



export function getAllDemoBuildings(): ViewerBuilding[] {

  return DEMO_BUILDINGS.map((def) => getDemoBuilding(def.id)!);

}



export function getDemoSceneGraph(buildingId: string): SceneGraph | null {

  const def = demoDef(buildingId);

  if (!def) {

    return null;

  }



  const building = getDemoBuilding(def.id)!;



  return {

    building_id: def.id,

    building_name: building.name,

    graph_data_id: def.graphDataId,

    created_at: new Date().toISOString(),

    scene_graph: def.skeleton.scene_graph,

  };

}



export function getDemoFacilityBuilding(): ViewerBuilding {

  return getDemoBuilding(DEMO_FACILITY_BUILDING_ID)!;

}



export function getDemoFacilitySceneGraph(): SceneGraph {

  return getDemoSceneGraph(DEMO_FACILITY_BUILDING_ID)!;

}



function prependDemoBuildings(buildings: ViewerBuilding[]): ViewerBuilding[] {

  let result = buildings;



  for (const demo of getAllDemoBuildings()) {

    if (result.some((building) => building.id === demo.id)) {

      continue;

    }



    result = [demo, ...result];

  }



  return result;

}



export function mergeDemoFacilityBuildings(

  buildings: ViewerBuilding[],

  user: AuthUser | null | undefined

): ViewerBuilding[] {

  if (!isDemoFacilityUser(user)) {

    return buildings;

  }



  return prependDemoBuildings(buildings);

}



export function mergeDemoWorkspace(

  data: ViewerBootstrap,

  user: AuthUser | null | undefined

): ViewerBootstrap {

  if (!isDemoWorkspaceUser(user)) {

    return data;

  }



  const buildings = prependDemoBuildings(data.buildings);

  const defaultBuildingId = DEMO_FACILITY_BUILDING_ID;

  const defaultSceneGraph =

    data.default_building_id && isDemoBuildingId(data.default_building_id) && data.default_scene_graph

      ? data.default_scene_graph

      : getDemoSceneGraph(DEMO_FACILITY_BUILDING_ID)!;



  return {

    buildings,

    default_building_id: defaultBuildingId,

    default_scene_graph: defaultSceneGraph,

  };

}



/** @deprecated use mergeDemoWorkspace */

export function mergeDemoFacilityWorkspace(

  data: ViewerBootstrap,

  user: AuthUser | null | undefined

): ViewerBootstrap {

  return mergeDemoWorkspace(data, user);

}


