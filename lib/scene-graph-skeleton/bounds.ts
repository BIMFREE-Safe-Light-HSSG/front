import { skeletonCenterToThreeBase, skeletonPointToThree } from "./coordinates"
import type { FacilityAssetRef, Vec3, ZoneNode } from "./types"

export type SceneBounds = {
  min: Vec3
  max: Vec3
  center: Vec3
  size: Vec3
}

function growBounds(bounds: SceneBounds, x: number, y: number, z: number) {
  bounds.min[0] = Math.min(bounds.min[0], x)
  bounds.min[1] = Math.min(bounds.min[1], y)
  bounds.min[2] = Math.min(bounds.min[2], z)
  bounds.max[0] = Math.max(bounds.max[0], x)
  bounds.max[1] = Math.max(bounds.max[1], y)
  bounds.max[2] = Math.max(bounds.max[2], z)
}

export function boundsFromZones(zones: ZoneNode[], assets: FacilityAssetRef[] = []): SceneBounds | null {
  if (zones.length === 0 && assets.length === 0) return null

  const bounds: SceneBounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
    center: [0, 0, 0],
    size: [0, 0, 0],
  }

  for (const zone of zones) {
    const { center, height, coordinates } = zone.geometry
    const baseY = skeletonCenterToThreeBase(center, height)
    const topY = center[2] + height / 2
    growBounds(bounds, center[0], baseY, center[1])
    growBounds(bounds, center[0], topY, center[1])
    for (const [x, planY] of coordinates) {
      growBounds(bounds, x, baseY, planY)
      growBounds(bounds, x, topY, planY)
    }
  }

  for (const asset of assets) {
    const [x, y, z] = skeletonPointToThree(asset.position[0], asset.position[1], asset.position[2])
    growBounds(bounds, x, y, z)
  }

  bounds.center = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ]
  bounds.size = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ]
  return bounds
}
