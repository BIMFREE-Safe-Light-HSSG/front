import * as THREE from "three"

import type { SceneBounds } from "./bounds"
import { skeletonPointToThree } from "./coordinates"
import type { FacilityAssetRef, Vec3, ZoneNode } from "./types"

export type CameraViewPreset = "reset" | "top" | "iso"

export type CameraPose = {
  position: THREE.Vector3
  target: THREE.Vector3
}

function maxSceneDim(bounds: SceneBounds): number {
  return Math.max(bounds.size[0], bounds.size[1], bounds.size[2], 1)
}

function applyNearFar(camera: THREE.PerspectiveCamera, bounds: SceneBounds) {
  const maxDim = maxSceneDim(bounds)
  camera.near = maxDim / 200
  camera.far = maxDim * 20
  camera.updateProjectionMatrix()
}

export function configureCameraForBounds(
  camera: THREE.PerspectiveCamera,
  bounds: SceneBounds,
): void {
  applyNearFar(camera, bounds)
}

export function cameraPoseForPreset(
  preset: CameraViewPreset,
  bounds: SceneBounds,
): CameraPose {
  const target = new THREE.Vector3(bounds.center[0], bounds.center[1], bounds.center[2])
  const maxDim = maxSceneDim(bounds)
  const dist = maxDim * 1.35

  switch (preset) {
    case "top":
      return {
        target,
        position: new THREE.Vector3(
          bounds.center[0],
          bounds.center[1] + dist * 1.15,
          bounds.center[2],
        ),
      }
    case "iso":
    case "reset":
    default:
      return {
        target,
        position: new THREE.Vector3(
          bounds.center[0] + dist * 0.72,
          bounds.center[1] + dist * 0.55,
          bounds.center[2] + dist * 0.72,
        ),
      }
  }
}

export function zonePlanRadius(zone: ZoneNode): number {
  const [cx, cy] = [zone.geometry.center[0], zone.geometry.center[1]]
  let maxR = 0
  for (const [x, y] of zone.geometry.coordinates) {
    maxR = Math.max(maxR, Math.hypot(x - cx, y - cy))
  }
  return Math.max(maxR, zone.geometry.height * 0.5, 2)
}

export function focusTargetForZone(zone: ZoneNode): THREE.Vector3 {
  const [x, y, z] = skeletonPointToThree(
    zone.geometry.center[0],
    zone.geometry.center[1],
    zone.geometry.center[2],
  )
  return new THREE.Vector3(x, y, z)
}

export function focusTargetForAsset(asset: FacilityAssetRef): THREE.Vector3 {
  const [x, y, z] = skeletonPointToThree(
    asset.position[0],
    asset.position[1],
    asset.position[2],
  )
  return new THREE.Vector3(x, y, z)
}

/** Orbit target만 살짝 옮길 때 — 줌·회전 각 유지, 평행 이동만 */
export function cameraPosePanTarget(
  target: THREE.Vector3,
  currentPosition: THREE.Vector3,
  currentTarget: THREE.Vector3,
): CameraPose {
  const delta = target.clone().sub(currentTarget)
  return {
    target: target.clone(),
    position: currentPosition.clone().add(delta),
  }
}

export function cameraPoseFocusOnPoint(
  target: THREE.Vector3,
  bounds: SceneBounds,
  options?: { distanceScale?: number; elevationRatio?: number },
): CameraPose {
  const scale = options?.distanceScale ?? 1
  const elev = options?.elevationRatio ?? 0.42
  const dist = Math.max(maxSceneDim(bounds) * 0.38, 6) * scale
  return {
    target: target.clone(),
    position: new THREE.Vector3(
      target.x + dist * 0.5,
      target.y + dist * elev,
      target.z + dist * 0.5,
    ),
  }
}

export function cameraPoseFocusOnZone(zone: ZoneNode, bounds: SceneBounds): CameraPose {
  const target = focusTargetForZone(zone)
  const radius = zonePlanRadius(zone)
  return cameraPoseFocusOnPoint(target, bounds, {
    distanceScale: Math.max(0.55, Math.min(1, radius / maxSceneDim(bounds) + 0.35)),
    elevationRatio: 0.43,
  })
}

export function cameraPoseFocusOnAsset(
  asset: FacilityAssetRef,
  bounds: SceneBounds,
): CameraPose {
  const target = focusTargetForAsset(asset)
  return cameraPoseFocusOnPoint(target, bounds, {
    distanceScale: 0.55,
    elevationRatio: 0.38,
  })
}

export function focusTargetForBounds(bounds: SceneBounds): THREE.Vector3 {
  return new THREE.Vector3(bounds.center[0], bounds.center[1], bounds.center[2])
}

/** 검색·필터 결과 bbox에 맞춘 카메라 */
export function cameraPoseFocusOnBounds(
  targetBounds: SceneBounds,
  sceneBounds: SceneBounds,
): CameraPose {
  const target = focusTargetForBounds(targetBounds)
  const span = Math.max(
    targetBounds.size[0],
    targetBounds.size[1],
    targetBounds.size[2],
    2,
  )
  const sceneSpan = maxSceneDim(sceneBounds)
  const dist = Math.max(span * 1.85, sceneSpan * 0.28, 8)
  return {
    target,
    position: new THREE.Vector3(
      target.x + dist * 0.62,
      target.y + dist * 0.48,
      target.z + dist * 0.62,
    ),
  }
}

export function vec3ToThree(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2])
}
