import type { OrbitViewState } from "@deck.gl/core"



import type { FacilityPointCloud } from "./types"



export type FacilityPointCloudAxisBounds = {

  minX: number

  minY: number

  minZ: number

  maxX: number

  maxY: number

  maxZ: number

}



/** Axis-aligned bounds of all finite points (uses `interleaved` xyz when available). */

export function getFacilityPointCloudAxisBounds(cloud: FacilityPointCloud): FacilityPointCloudAxisBounds | null {

  const n = cloud.pointCount

  let minX = Infinity

  let minY = Infinity

  let minZ = Infinity

  let maxX = -Infinity

  let maxY = -Infinity

  let maxZ = -Infinity



  const consider = (x: number, y: number, z: number) => {

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {

      return

    }

    minX = Math.min(minX, x)

    minY = Math.min(minY, y)

    minZ = Math.min(minZ, z)

    maxX = Math.max(maxX, x)

    maxY = Math.max(maxY, y)

    maxZ = Math.max(maxZ, z)

  }



  if (cloud.interleaved && cloud.interleaved.length >= n * 7) {

    for (let i = 0; i < n; i++) {

      const o = i * 7

      consider(cloud.interleaved[o]!, cloud.interleaved[o + 1]!, cloud.interleaved[o + 2]!)

    }

  } else {

    const { positions } = cloud

    const limit = Math.min(n, Math.floor(positions.length / 3))

    for (let i = 0; i < limit; i++) {

      const o = i * 3

      consider(positions[o]!, positions[o + 1]!, positions[o + 2]!)

    }

  }



  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {

    return null

  }

  return { minX, minY, minZ, maxX, maxY, maxZ }

}



const default3dView: OrbitViewState = {

  target: [0, 0, 0],

  zoom: 1,

  rotationOrbit: 30,

  rotationX: 15,

  minRotationX: -90,

  maxRotationX: 90,

}



const defaultPlanView: OrbitViewState = {

  target: [0, 0, 0],

  zoom: 1,

  rotationOrbit: 0,

  rotationX: 90,

  minRotationX: 90,

  maxRotationX: 90,

}



/** Rough initial orbit view from axis-aligned bounds (Cartesian coordinates). */

export function orbitViewStateFromPointCloud(

  cloud: FacilityPointCloud,

  viewportHeightPx: number,

): OrbitViewState {

  const b = getFacilityPointCloudAxisBounds(cloud)

  if (!b) {

    return { ...default3dView }

  }



  const cx = (b.minX + b.maxX) / 2

  const cy = (b.minY + b.maxY) / 2

  const cz = (b.minZ + b.maxZ) / 2

  const size = Math.max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ, 1e-6)

  const zoom = Math.max(-2, Math.min(12, Math.log2(viewportHeightPx / size)))

  return {

    target: [cx, cy, cz],

    zoom,

    rotationOrbit: 30,

    rotationX: 15,

    minRotationX: -90,

    maxRotationX: 90,

  }

}



/**

 * Top-down “plan” style view: camera looks along −Z at the XY plane (OrbitView, orbitAxis Z).

 * Zoom is fit from XY extent only so the footprint fills the viewport.

 */

export function planOrbitViewStateFromPointCloud(

  cloud: FacilityPointCloud,

  viewportHeightPx: number,

): OrbitViewState {

  const b = getFacilityPointCloudAxisBounds(cloud)

  if (!b) {

    return { ...defaultPlanView }

  }



  const cx = (b.minX + b.maxX) / 2

  const cy = (b.minY + b.maxY) / 2

  const cz = (b.minZ + b.maxZ) / 2

  const dx = b.maxX - b.minX

  const dy = b.maxY - b.minY

  const size = Math.max(dx, dy, 1e-6)

  const zoom = Math.max(-2, Math.min(12, Math.log2(viewportHeightPx / size)))

  return {

    target: [cx, cy, cz],

    zoom,

    rotationOrbit: 0,

    rotationX: 90,

    minRotationX: 90,

    maxRotationX: 90,

  }

}


