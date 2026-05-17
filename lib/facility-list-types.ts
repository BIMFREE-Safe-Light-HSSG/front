/** Viewer slot id (향후 시설별 scene graph / point cloud 매핑). */
export const FACILITY_DATA_IDS = ["1", "2", "3"] as const
export type FacilityDataId = (typeof FACILITY_DATA_IDS)[number]

export function parseFacilityDataId(raw: string): FacilityDataId | null {
  return (FACILITY_DATA_IDS as readonly string[]).includes(raw) ? (raw as FacilityDataId) : null
}

export type FacilityListItem = {
  /** 시설 레코드 ID (DB PK 등). 상세 뷰어는 `dataId`로 진입. */
  id: string
  name: string
  description?: string
  dataId: FacilityDataId
}

export type FacilitiesListResponse = {
  facilities: FacilityListItem[]
}
