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

export type SkeletonAsset = {
  id: string
  class: string
  position: Vec3
  status?: AssetStatus
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
  }
}

export type FacilityAssetRef = SkeletonAsset & {
  zoneId?: string
  zoneName?: string
}
