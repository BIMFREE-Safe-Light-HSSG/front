import type { CameraViewPreset } from "@/lib/scene-graph-skeleton/camera-views"

export type ViewerLayerVisibility = {
  zones: boolean
  assets: boolean
  fires: boolean
}

export const DEFAULT_LAYER_VISIBILITY: ViewerLayerVisibility = {
  zones: true,
  assets: true,
  fires: true,
}

/** 소방 — 구역 + door/window 등 구조 시설만 표시 */
export const STRUCTURAL_LAYER_VISIBILITY: ViewerLayerVisibility = {
  zones: true,
  assets: true,
  fires: true,
}

/** subtle: 선택 시 타깃만 살짝 팬 · medium: 포커스 버튼 · full: 프리셋 */
export type CameraFocusIntensity = "subtle" | "medium" | "full"

export type CameraCommandAction =
  | { type: "preset"; preset: CameraViewPreset }
  | { type: "focus-zone"; zoneId: string; intensity?: CameraFocusIntensity }
  | { type: "focus-asset"; assetId: string; intensity?: CameraFocusIntensity }

export type CameraCommand = {
  seq: number
  action: CameraCommandAction
}
