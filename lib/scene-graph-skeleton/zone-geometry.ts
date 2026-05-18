import * as THREE from "three"

import { skeletonCenterToThreeBase } from "./coordinates"
import type { ZoneNode } from "./types"

const ZONE_PALETTE = [
  0x7eb8ff, 0x6ee7b7, 0xfbbf24, 0xc4b5fd, 0xf9a8d4, 0x67e8f9, 0xfdba74, 0xa5b4fc,
] as const

export function zoneAccentColor(index: number): number {
  return ZONE_PALETTE[index % ZONE_PALETTE.length]!
}

function buildZoneShape(zone: ZoneNode): THREE.Shape | null {
  const { coordinates } = zone.geometry
  if (coordinates.length < 3) return null
  const shape = new THREE.Shape()
  const [x0, y0] = coordinates[0]!
  shape.moveTo(x0, -y0)
  for (let i = 1; i < coordinates.length; i++) {
    const [x, y] = coordinates[i]!
    shape.lineTo(x, -y)
  }
  shape.closePath()
  return shape
}

export function createZoneExtrudeGeometry(zone: ZoneNode): THREE.ExtrudeGeometry | null {
  const { height } = zone.geometry
  if (height <= 0) return null
  const shape = buildZoneShape(zone)
  if (!shape) return null
  return new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  })
}

/** Thin floor pick surface — glass extrude does not participate in raycasts. */
export function createZoneFloorPickGeometry(zone: ZoneNode): THREE.ShapeGeometry | null {
  const shape = buildZoneShape(zone)
  if (!shape) return null
  return new THREE.ShapeGeometry(shape)
}

export type ZoneGlassMaterialOptions = {
  opacity?: number
  color?: number
  emissive?: number
  emissiveIntensity?: number
}

export function createGlassZoneMaterial(
  color: number,
  options?: ZoneGlassMaterialOptions,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: options?.color ?? color,
    emissive: options?.emissive ?? 0x000000,
    emissiveIntensity: options?.emissiveIntensity ?? 0,
    transparent: true,
    opacity: options?.opacity ?? 0.3,
    metalness: 0.05,
    roughness: 0.15,
    transmission: 0.35,
    thickness: 0.4,
    ior: 1.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

export function zoneMeshTransform(zone: ZoneNode): {
  position: THREE.Vector3
  rotation: THREE.Euler
} {
  const baseY = skeletonCenterToThreeBase(zone.geometry.center, zone.geometry.height)
  return {
    position: new THREE.Vector3(0, baseY, 0),
    rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
  }
}

export function createZoneOutlineGeometry(zone: ZoneNode): THREE.BufferGeometry | null {
  const { coordinates, center, height } = zone.geometry
  if (coordinates.length < 2) return null
  const y = skeletonCenterToThreeBase(center, height) + 0.02
  const points: THREE.Vector3[] = []
  for (const [x, planY] of coordinates) {
    points.push(new THREE.Vector3(x, y, planY))
  }
  points.push(new THREE.Vector3(coordinates[0]![0], y, coordinates[0]![1]))
  return new THREE.BufferGeometry().setFromPoints(points)
}
