import type { CameraViewPreset } from "@/lib/scene-graph-skeleton/camera-views"

export type ViewerLayerVisibility = {
  /** 구역 shell·통합 바닥 */
  shell: boolean
  /** 시설 핀·instanced 마커 */
  facility: boolean
  /** door / window 등 구조 mesh */
  structure: boolean
  fires: boolean
}

export const DEFAULT_LAYER_VISIBILITY: ViewerLayerVisibility = {
  shell: true,
  facility: true,
  structure: true,
  fires: true,
}

/** 구역 shell — 실내 보기(반투명·천장 제거) */
export type ViewerShellDisplay = {
  transparent: boolean
  openRoof: boolean
}

export const DEFAULT_SHELL_DISPLAY: ViewerShellDisplay = {
  transparent: false,
  openRoof: false,
}

/** 소방 — shell + 구조 시설, facility 핀 숨김 */
export const FIREFIGHTER_LAYER_VISIBILITY: ViewerLayerVisibility = {
  shell: true,
  facility: false,
  structure: true,
  fires: true,
}

/** @deprecated FIREFIGHTER_LAYER_VISIBILITY 사용 */
export const STRUCTURAL_LAYER_VISIBILITY = FIREFIGHTER_LAYER_VISIBILITY

/** subtle: 선택 시 타깃만 살짝 팬 · medium: 포커스 버튼 · full: 프리셋 */
export type CameraFocusIntensity = "subtle" | "medium" | "full"

export type CameraCommandAction =
  | { type: "preset"; preset: CameraViewPreset }
  | { type: "focus-zone"; zoneId: string; intensity?: CameraFocusIntensity }
  | { type: "focus-asset"; assetId: string; intensity?: CameraFocusIntensity }
  | {
      type: "focus-bounds"
      min: [number, number, number]
      max: [number, number, number]
      intensity?: CameraFocusIntensity
    }

export type CameraCommand = {
  seq: number
  action: CameraCommandAction
}
