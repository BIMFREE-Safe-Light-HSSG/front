/** Slot for binary under `app/api/data{N}.npy`. */
export const FACILITY_DATA_IDS = ["1", "2", "3"] as const
export type FacilityDataId = (typeof FACILITY_DATA_IDS)[number]

export function parseFacilityDataId(raw: string): FacilityDataId | null {
  return (FACILITY_DATA_IDS as readonly string[]).includes(raw) ? (raw as FacilityDataId) : null
}

export type FacilityListItem = {
  /** 시설 레코드 ID (DB PK 등). 뷰어 상세는 `dataId`로 포인트를 로드. */
  id: string
  name: string
  description?: string
  dataId: FacilityDataId
}

export type FacilitiesListResponse = {
  facilities: FacilityListItem[]
}
