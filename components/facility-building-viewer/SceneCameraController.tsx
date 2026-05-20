"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

import type {
  CameraCommand,
  CameraFocusIntensity,
} from "@/components/facility-building-viewer/scene-camera-types"
import {
  cameraPoseFocusOnAsset,
  cameraPoseFocusOnZone,
  cameraPoseForPreset,
  cameraPosePanTarget,
  configureCameraForBounds,
  focusTargetForAsset,
  focusTargetForZone,
  type CameraPose,
} from "@/lib/scene-graph-skeleton/camera-views"
import type { SceneBounds } from "@/lib/scene-graph-skeleton/bounds"
import type { FacilityAssetRef, ZoneNode } from "@/lib/scene-graph-skeleton/types"

const FLY_DURATION: Record<CameraFocusIntensity, number> = {
  subtle: 0.42,
  medium: 0.55,
  full: 0.72,
}

/** 현재 시선에서 목표까지 보간 비율 (작을수록 덜 움직임) */
const BLEND: Record<CameraFocusIntensity, number> = {
  subtle: 0.22,
  medium: 0.38,
  full: 1,
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

function blendPose(
  fromPos: THREE.Vector3,
  fromTarget: THREE.Vector3,
  desired: CameraPose,
  amount: number,
): CameraPose {
  const t = Math.min(1, Math.max(0, amount))
  return {
    position: fromPos.clone().lerp(desired.position, t),
    target: fromTarget.clone().lerp(desired.target, t),
  }
}

type SceneCameraControllerProps = {
  bounds: SceneBounds
  zones: ZoneNode[]
  assets: FacilityAssetRef[]
  command: CameraCommand | null
  initialPreset?: "reset" | "iso"
}

export function SceneCameraController({
  bounds,
  zones,
  assets,
  command,
  initialPreset = "iso",
}: SceneCameraControllerProps) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)
  const animRef = useRef<{
    fromPos: THREE.Vector3
    toPos: THREE.Vector3
    fromTarget: THREE.Vector3
    toTarget: THREE.Vector3
    elapsed: number
    duration: number
  } | null>(null)
  const initializedRef = useRef(false)

  const maxDim = Math.max(bounds.size[0], bounds.size[1], bounds.size[2], 1)

  const startFly = (pose: CameraPose, intensity: CameraFocusIntensity = "full") => {
    const controls = controlsRef.current
    if (!controls) return

    const skipDist = maxDim * 0.06
    if (
      intensity !== "full" &&
      controls.target.distanceTo(pose.target) < skipDist &&
      camera.position.distanceTo(pose.position) < skipDist * 2.5
    ) {
      return
    }

    animRef.current = {
      fromPos: camera.position.clone(),
      toPos: pose.position.clone(),
      fromTarget: controls.target.clone(),
      toTarget: pose.target.clone(),
      elapsed: 0,
      duration: FLY_DURATION[intensity],
    }
  }

  const resolveCommand = (
    action: CameraCommand["action"],
  ): { pose: CameraPose; intensity: CameraFocusIntensity } | null => {
    const controls = controlsRef.current
    if (!controls) return null

    const intensity: CameraFocusIntensity =
      action.type === "preset" ? "full" : (action.intensity ?? "medium")

    switch (action.type) {
      case "preset":
        return {
          pose: cameraPoseForPreset(action.preset, bounds),
          intensity: "full",
        }
      case "focus-zone": {
        const zone = zones.find((z) => z.id === action.zoneId)
        if (!zone) return null
        const target = focusTargetForZone(zone)
        const desired =
          intensity === "subtle"
            ? cameraPosePanTarget(target, camera.position, controls.target)
            : cameraPoseFocusOnZone(zone, bounds)
        return {
          pose: blendPose(
            camera.position,
            controls.target,
            desired,
            BLEND[intensity],
          ),
          intensity,
        }
      }
      case "focus-asset": {
        const asset = assets.find((a) => a.id === action.assetId)
        if (!asset) return null
        const target = focusTargetForAsset(asset)
        const desired =
          intensity === "subtle"
            ? cameraPosePanTarget(target, camera.position, controls.target)
            : cameraPoseFocusOnAsset(asset, bounds)
        return {
          pose: blendPose(
            camera.position,
            controls.target,
            desired,
            BLEND[intensity],
          ),
          intensity,
        }
      }
      default:
        return null
    }
  }

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.minDistance = maxDim * 0.12
    controls.maxDistance = maxDim * 3.2
    controlsRef.current = controls

    if (camera instanceof THREE.PerspectiveCamera) {
      configureCameraForBounds(camera, bounds)
    }

    const initial = cameraPoseForPreset(initialPreset, bounds)
    camera.position.copy(initial.position)
    controls.target.copy(initial.target)
    controls.update()
    initializedRef.current = true

    return () => {
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, gl, bounds, initialPreset, maxDim])

  useEffect(() => {
    if (!command || !initializedRef.current) return
    const resolved = resolveCommand(command.action)
    if (resolved) startFly(resolved.pose, resolved.intensity)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- command seq only
  }, [command?.seq])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const anim = animRef.current
    if (anim) {
      anim.elapsed += delta
      const u = easeInOutQuad(Math.min(1, anim.elapsed / anim.duration))
      camera.position.lerpVectors(anim.fromPos, anim.toPos, u)
      controls.target.lerpVectors(anim.fromTarget, anim.toTarget, u)
      if (u >= 1) {
        camera.position.copy(anim.toPos)
        controls.target.copy(anim.toTarget)
        animRef.current = null
      }
    }
    controls.update()
  })

  return null
}
