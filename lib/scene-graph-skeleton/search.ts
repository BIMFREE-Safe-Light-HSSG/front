import type { AssetStatus, FacilityAssetRef, ZoneNode } from "./types"

export type ViewerEntityFilter = "all" | "zones" | "assets"

export type ViewerSearchFilters = {
  query: string
  entityType: ViewerEntityFilter
  assetClasses: string[]
  assetStatuses: AssetStatus[]
  zoneId: string | null
}

export const DEFAULT_VIEWER_SEARCH_FILTERS: ViewerSearchFilters = {
  query: "",
  entityType: "all",
  assetClasses: [],
  assetStatuses: [],
  zoneId: null,
}

export type ViewerSearchResult =
  | { kind: "zone"; id: string; title: string; subtitle: string; zone: ZoneNode }
  | { kind: "asset"; id: string; title: string; subtitle: string; asset: FacilityAssetRef }

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}

function matchesText(haystack: string, query: string): boolean {
  if (!query) return true
  return haystack.toLowerCase().includes(query)
}

function assetMatchesFilters(asset: FacilityAssetRef, filters: ViewerSearchFilters, query: string): boolean {
  if (filters.zoneId && asset.zoneId !== filters.zoneId) return false
  if (filters.assetClasses.length > 0 && !filters.assetClasses.includes(asset.class)) return false
  if (filters.assetStatuses.length > 0) {
    const status = asset.status ?? "normal"
    if (!filters.assetStatuses.includes(status)) return false
  }
  if (!query) return true
  const blob = [asset.id, asset.class, asset.zoneName ?? "", asset.status ?? "", ...asset.position.map(String)].join(
    " ",
  )
  return matchesText(blob, query)
}

function zoneMatchesFilters(zone: ZoneNode, filters: ViewerSearchFilters, query: string): boolean {
  if (filters.zoneId && zone.id !== filters.zoneId) return false
  if (filters.entityType === "zones") {
    if (!query) return true
  } else if (!query) {
    return false
  }
  const blob = [
    zone.id,
    zone.name,
    zone.geometry.height.toString(),
    ...zone.geometry.center.map(String),
  ].join(" ")
  return matchesText(blob, query)
}

/** 구역 검색·노란 하이라이트 — 시설 분류/상태만 고를 때는 false */
export function shouldSearchZones(filters: ViewerSearchFilters): boolean {
  if (filters.entityType === "assets") return false
  if (filters.entityType === "zones") return true
  const query = normalizeQuery(filters.query)
  if (query.length > 0) return true
  if (filters.zoneId) return true
  return false
}

export function hasActiveViewerSearch(filters: ViewerSearchFilters): boolean {
  return (
    normalizeQuery(filters.query).length > 0 ||
    filters.entityType !== "all" ||
    filters.assetClasses.length > 0 ||
    filters.assetStatuses.length > 0 ||
    filters.zoneId !== null
  )
}

export function runViewerSearch(
  zones: ZoneNode[],
  assets: FacilityAssetRef[],
  filters: ViewerSearchFilters,
): ViewerSearchResult[] {
  const query = normalizeQuery(filters.query)
  const active = hasActiveViewerSearch(filters)
  if (!active) return []

  const results: ViewerSearchResult[] = []

  if (shouldSearchZones(filters)) {
    for (const zone of zones) {
      if (!zoneMatchesFilters(zone, filters, query)) continue
      results.push({
        kind: "zone",
        id: zone.id,
        title: zone.name,
        subtitle: zone.id,
        zone,
      })
    }
  }

  if (filters.entityType === "all" || filters.entityType === "assets") {
    for (const asset of assets) {
      if (!assetMatchesFilters(asset, filters, query)) continue
      results.push({
        kind: "asset",
        id: asset.id,
        title: asset.class,
        subtitle: `${asset.id}${asset.zoneName ? ` · ${asset.zoneName}` : ""}`,
        asset,
      })
    }
  }

  return results
}

/**
 * 검색 패널과 동일한 조건으로 3D 캔버스에 그릴 자산을 고릅니다.
 * (키워드·구역·분류·상태·대상=시설만 — 결과 목록과 동일 규칙)
 */
export function filterAssetsForViewerDisplay(
  assets: FacilityAssetRef[],
  filters: ViewerSearchFilters,
): FacilityAssetRef[] {
  if (filters.entityType === "zones") {
    return []
  }

  if (!hasActiveViewerSearch(filters)) {
    return assets
  }

  const query = normalizeQuery(filters.query)
  return assets.filter((asset) => assetMatchesFilters(asset, filters, query))
}

export function highlightSetsFromResults(
  results: ViewerSearchResult[],
  options?: { includeZones?: boolean },
): {
  zoneIds: Set<string>
  assetIds: Set<string>
} {
  const includeZones = options?.includeZones ?? true
  const zoneIds = new Set<string>()
  const assetIds = new Set<string>()
  for (const r of results) {
    if (r.kind === "zone") {
      if (includeZones) zoneIds.add(r.id)
    } else {
      assetIds.add(r.id)
    }
  }
  return { zoneIds, assetIds }
}
