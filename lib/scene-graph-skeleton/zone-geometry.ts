import * as THREE from "three"

import { skeletonCenterToThreeBase } from "./coordinates"
import type { ZoneNode } from "./types"

/** MergedBuildingSlab — shell과 겹침 방지 */
export const FLOOR_SURFACE_LIFT = 0.025

const ZONE_PALETTE = [
  0x7eb8ff, 0x6ee7b7, 0xfbbf24, 0xc4b5fd, 0xf9a8d4, 0x67e8f9, 0xfdba74, 0xa5b4fc,
] as const

/** 소방 뷰: 화재 없는 구역 단일 색 */
export const FIREFIGHTER_NEUTRAL_ZONE_COLOR = 0x5b7a9a
/** 소방 뷰: 화재 지점이 있는 구역 */
export const FIREFIGHTER_FIRE_ZONE_COLOR = 0xdc2626

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

const capNormalScratch = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
]

/** 월드 +Y를 향하는 천장·상단 캡 면 제거 (컷어웨이) */
export function stripUpwardCapFaces(
  geometry: THREE.BufferGeometry,
  minNormalY = 0.92,
): THREE.BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const position = source.attributes.position
  let normals = source.attributes.normal as THREE.BufferAttribute | undefined
  const colors = source.attributes.color
  if (!normals) {
    source.computeVertexNormals()
    normals = source.attributes.normal as THREE.BufferAttribute
  }

  const keptPositions: number[] = []
  const keptNormals: number[] = []
  const keptColors: number[] = []

  for (let i = 0; i < position.count; i += 3) {
    for (let v = 0; v < 3; v++) {
      capNormalScratch[v]!.fromBufferAttribute(normals, i + v)
    }
    const avgNy =
      (capNormalScratch[0]!.y +
        capNormalScratch[1]!.y +
        capNormalScratch[2]!.y) /
      3
    if (avgNy >= minNormalY) continue

    for (let v = 0; v < 3; v++) {
      const idx = i + v
      keptPositions.push(
        position.getX(idx),
        position.getY(idx),
        position.getZ(idx),
      )
      keptNormals.push(normals.getX(idx), normals.getY(idx), normals.getZ(idx))
      if (colors) {
        keptColors.push(colors.getX(idx), colors.getY(idx), colors.getZ(idx))
      }
    }
  }

  const next = new THREE.BufferGeometry()
  next.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(keptPositions, 3),
  )
  next.setAttribute("normal", new THREE.Float32BufferAttribute(keptNormals, 3))
  if (colors && keptColors.length > 0) {
    next.setAttribute("color", new THREE.Float32BufferAttribute(keptColors, 3))
  }
  next.computeBoundingSphere()
  if (source !== geometry) source.dispose()
  return next
}

/** 월드 −Y를 향하는 바닥 캡 면 제거 (MergedBuildingSlab과 Z-fighting 방지) */
export function stripDownwardCapFaces(
  geometry: THREE.BufferGeometry,
  maxNormalY = -0.92,
): THREE.BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const position = source.attributes.position
  let normals = source.attributes.normal as THREE.BufferAttribute | undefined
  const colors = source.attributes.color
  if (!normals) {
    source.computeVertexNormals()
    normals = source.attributes.normal as THREE.BufferAttribute
  }

  const keptPositions: number[] = []
  const keptNormals: number[] = []
  const keptColors: number[] = []

  for (let i = 0; i < position.count; i += 3) {
    for (let v = 0; v < 3; v++) {
      capNormalScratch[v]!.fromBufferAttribute(normals, i + v)
    }
    const avgNy =
      (capNormalScratch[0]!.y +
        capNormalScratch[1]!.y +
        capNormalScratch[2]!.y) /
      3
    if (avgNy <= maxNormalY) continue

    for (let v = 0; v < 3; v++) {
      const idx = i + v
      keptPositions.push(
        position.getX(idx),
        position.getY(idx),
        position.getZ(idx),
      )
      keptNormals.push(normals.getX(idx), normals.getY(idx), normals.getZ(idx))
      if (colors) {
        keptColors.push(colors.getX(idx), colors.getY(idx), colors.getZ(idx))
      }
    }
  }

  const next = new THREE.BufferGeometry()
  next.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(keptPositions, 3),
  )
  next.setAttribute("normal", new THREE.Float32BufferAttribute(keptNormals, 3))
  if (colors && keptColors.length > 0) {
    next.setAttribute("color", new THREE.Float32BufferAttribute(keptColors, 3))
  }
  next.computeBoundingSphere()
  if (source !== geometry) source.dispose()
  return next
}

/** Thin floor pick surface — glass extrude does not participate in raycasts. */
export function createZoneFloorPickGeometry(zone: ZoneNode): THREE.ShapeGeometry | null {
  const shape = buildZoneShape(zone)
  if (!shape) return null
  const geo = new THREE.ShapeGeometry(shape)
  geo.computeVertexNormals()
  return geo
}

function ensureUpwardFacingNormals(geo: THREE.BufferGeometry) {
  geo.computeVertexNormals()
  const normals = geo.attributes.normal as THREE.BufferAttribute | undefined
  if (!normals || normals.count === 0) return
  let sumY = 0
  for (let i = 0; i < normals.count; i++) sumY += normals.getY(i)
  if (sumY < 0) {
    geo.scale(1, 1, -1)
    geo.computeVertexNormals()
  }
}

/** 구역 바닥 — 월드 XZ 평면(+Y 법선)에 배치된 시각·pick 공용 geometry */
export function createZoneFloorWorldGeometry(zone: ZoneNode): THREE.BufferGeometry | null {
  const shape = buildZoneShape(zone)
  if (!shape) return null
  const geo = new THREE.ShapeGeometry(shape)
  geo.rotateX(-Math.PI / 2)
  const baseY = skeletonCenterToThreeBase(zone.geometry.center, zone.geometry.height)
  geo.translate(0, baseY + FLOOR_SURFACE_LIFT, 0)
  ensureUpwardFacingNormals(geo)
  return geo
}

export type ZoneGlassMaterialOptions = {
  opacity?: number
  color?: number
  emissive?: number
  emissiveIntensity?: number
}

/** 불투명 shell — Physical glass 대비 draw/필 비용 절감 */
export function createShellZoneMaterial(
  color: number,
  options?: { opacity?: number; emissive?: number; emissiveIntensity?: number },
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: options?.emissive ?? 0x000000,
    emissiveIntensity: options?.emissiveIntensity ?? 0,
    transparent: (options?.opacity ?? 1) < 1,
    opacity: options?.opacity ?? 0.88,
    metalness: 0.08,
    roughness: 0.72,
    side: THREE.FrontSide,
    depthWrite: true,
  });
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

const shellMatrixPosition = new THREE.Vector3()
const shellMatrixQuaternion = new THREE.Quaternion()
const shellMatrixScale = new THREE.Vector3(1, 1, 1)
const shellMatrix = new THREE.Matrix4()

/** 구역 extrude를 월드 좌표로 올린 shell geometry (선택 시 천장 제거) */
export function createZoneShellWorldGeometry(
  zone: ZoneNode,
  openRoof = false,
): THREE.BufferGeometry | null {
  const base = createZoneExtrudeGeometry(zone)
  if (!base) return null

  const transform = zoneMeshTransform(zone)
  shellMatrixQuaternion.setFromEuler(transform.rotation)
  shellMatrix.compose(
    transform.position,
    shellMatrixQuaternion,
    shellMatrixScale,
  )
  const geo = base.clone()
  geo.applyMatrix4(shellMatrix)
  base.dispose()

  if (!openRoof) return geo
  const cut = stripUpwardCapFaces(geo, 0.985)
  if (cut !== geo) geo.dispose()
  cut.computeVertexNormals()
  return cut
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
  const y = skeletonCenterToThreeBase(center, height) + FLOOR_SURFACE_LIFT + 0.01
  const points: THREE.Vector3[] = []
  for (const [x, planY] of coordinates) {
    points.push(new THREE.Vector3(x, y, planY))
  }
  points.push(new THREE.Vector3(coordinates[0]![0], y, coordinates[0]![1]))
  return new THREE.BufferGeometry().setFromPoints(points)
}
