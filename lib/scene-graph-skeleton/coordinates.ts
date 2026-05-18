import type { Vec3 } from "./types"

/**
 * Skeleton JSON uses Z-up: polygon `coordinates` are [x, y] on the horizontal plane,
 * `center` is [x, y, z] with z as vertical midpoint. Three.js uses Y-up.
 */
export function skeletonPointToThree(x: number, y: number, z: number): Vec3 {
  return [x, z, y]
}

export function threePointToSkeleton(x: number, y: number, z: number): Vec3 {
  return [x, z, y]
}

export function skeletonCenterToThreeBase(center: Vec3, height: number): number {
  return center[2] - height / 2
}

export function parsePositionInput(raw: string): number | null {
  const n = Number(raw.trim())
  return Number.isFinite(n) ? n : null
}

export function formatPositionComponent(n: number): string {
  return n.toFixed(3)
}
