import type { OrbitViewState } from "@deck.gl/core"

import type { FacilitySceneGraphBounds } from "@/lib/facility-scene-graph/types"

export function orbitViewStateFromBounds(
  bounds: FacilitySceneGraphBounds,
  viewportHeightPx: number,
  planLikeDrawing: boolean,
): OrbitViewState {
  const [minX, minY, minZ] = bounds.min
  const [maxX, maxY, maxZ] = bounds.max
  const cx = bounds.center[0]
  const cy = bounds.center[1]
  const cz = bounds.center[2]

  if (planLikeDrawing) {
    const size = Math.max(maxX - minX, maxY - minY, 1e-6)
    const zoom = Math.max(-2, Math.min(14, Math.log2(viewportHeightPx / size)))
    return {
      target: [cx, cy, cz],
      zoom,
      rotationOrbit: 0,
      rotationX: 90,
      minRotationX: 90,
      maxRotationX: 90,
    }
  }

  const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6)
  const zoom = Math.max(-2, Math.min(14, Math.log2(viewportHeightPx / size)))
  return {
    target: [cx, cy, cz],
    zoom,
    rotationOrbit: 30,
    rotationX: 15,
    minRotationX: -90,
    maxRotationX: 90,
  }
}
