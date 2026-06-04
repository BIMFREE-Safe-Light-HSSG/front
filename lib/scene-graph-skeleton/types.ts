import type { FireIncident } from "@/lib/fire-incidents/types"

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]

/** `center` = [x, y, z] (z-up: z is vertical). `coordinates` = polygon [x, y] on the floor plan. */
export type ZoneGeometry = {
  type: "Polygon"
  center: Vec3
  height: number
  coordinates: Vec2[]
}

export type AssetStatus = "normal" | "inspection_due" | "fault" | "offline"

/** scene_graph 자산 노드의 점검·관리 이력 (sg_3: date/result/inspector/details, id·action 생략 가능) */
export type AssetInspectionRecord = {
  id: string
  date: string
  /** 레거시 `action` 또는 sg_3 `details` 요약 */
  action: string
  result: string
  inspector?: string
  /** sg_3.json 등 상세 설명 */
  details?: string
}

export type SkeletonAsset = {
  id: string
  class: string
  position: Vec3
  status?: AssetStatus
  inspection_history?: AssetInspectionRecord[]
  /** @deprecated legacy nested shape */
  type?: string
  name?: string
  category?: string
}

export type ZoneNode = {
  id: string
  type: "ZONE"
  name: string
  geometry: ZoneGeometry
  assets?: SkeletonAsset[]
}

export type SceneGraphSkeleton = {
  building_id: string
  scene_graph: {
    nodes: ZoneNode[]
    edges: unknown[]
    /** Building-level assets (preferred alongside zone.assets). */
    assets?: SkeletonAsset[]
    /** 건물 전체 정기·종합 점검 (자산 이력과 함께 패널에 표시) */
    inspection_history?: AssetInspectionRecord[]
    /** 시설관리자가 등록한 화재 위치 (API·데모 JSON) */
    fire_incidents?: FireIncident[]
  }
}

export type FacilityAssetRef = SkeletonAsset & {
  zoneId?: string
  zoneName?: string
}
