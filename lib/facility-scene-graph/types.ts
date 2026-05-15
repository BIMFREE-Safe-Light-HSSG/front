export type FacilitySceneTransform = {
  position: [number, number, number]
  scale: [number, number, number]
  rotation: [number, number, number]
}

export type FacilitySceneMaintenanceLog = {
  date: string
  type: string
  description: string
}

export type FacilitySceneNode = {
  id: string
  name: string
  class: string
  source_class?: string
  point_count?: number
  transform?: FacilitySceneTransform
  status?: string
  maintenance_log?: FacilitySceneMaintenanceLog[]
  children?: FacilitySceneNode[]
}

export type FacilitySceneGraphDocument = {
  scene_id: string
  version: string
  root: FacilitySceneNode
}

export type FacilitySceneGraphBounds = {
  min: [number, number, number]
  max: [number, number, number]
  center: [number, number, number]
}
