import type { FacilityPointCloud } from "@/lib/facility-point-cloud/types"
import { percentile, pushQuad, type MeshBuffers } from "@/lib/facility-mesh/geometry"
import {
  cornerFromPlaneUV,
  planeBasis,
  projectToPlaneUV,
  ransacPlane,
  type Point3,
} from "@/lib/facility-mesh/ransac-plane"
import {
  GLASS_STRUCTURE_SEMANTICS,
  STRUCTURE_GLASS_STYLE,
} from "@/lib/facility-mesh/semantic-labels"
import type { GlassMeshDocument, GlassMeshPrimitive } from "@/lib/facility-mesh/types"

function collectSemanticPoints(cloud: FacilityPointCloud, semanticId: number): Point3[] {
  const pts: Point3[] = []
  const { positions, pointCount, semanticIds } = cloud
  for (let i = 0; i < pointCount; i++) {
    if (semanticIds[i] !== semanticId) continue
    pts.push({
      x: positions[i * 3]!,
      y: positions[i * 3 + 1]!,
      z: positions[i * 3 + 2]!,
    })
  }
  return pts
}

function samplePoints(points: Point3[], max: number): Point3[] {
  if (points.length <= max) return points
  const step = points.length / max
  const out: Point3[] = []
  for (let i = 0; i < max; i++) {
    out.push(points[Math.floor(i * step)]!)
  }
  return out
}

function horizontalGlassMesh(
  id: string,
  semanticId: number,
  points: Point3[],
  zPick: "low" | "high",
): GlassMeshPrimitive | null {
  if (points.length < 50) return null

  const xs = points.map((p) => p.x).sort((a, b) => a - b)
  const ys = points.map((p) => p.y).sort((a, b) => a - b)
  const zs = points.map((p) => p.z).sort((a, b) => a - b)

  const minX = percentile(xs, 0.03)
  const maxX = percentile(xs, 0.97)
  const minY = percentile(ys, 0.03)
  const maxY = percentile(ys, 0.97)
  const z = zPick === "low" ? percentile(zs, 0.12) : percentile(zs, 0.88)

  if (maxX - minX < 0.2 || maxY - minY < 0.2) return null

  const style = STRUCTURE_GLASS_STYLE[semanticId]
  if (!style) return null

  const normal: [number, number, number] = zPick === "low" ? [0, 0, 1] : [0, 0, -1]
  const buf: MeshBuffers = { positions: [], normals: [], indices: [] }
  pushQuad(
    buf,
    [minX, minY, z],
    [maxX, minY, z],
    [maxX, maxY, z],
    [minX, maxY, z],
    normal,
  )

  return {
    id,
    semanticId,
    name: style.name,
    color: style.color,
    opacity: style.opacity,
    ...buf,
  }
}

function bboxFallbackWalls(points: Point3[]): GlassMeshPrimitive[] {
  if (points.length < 200) return []
  const style = STRUCTURE_GLASS_STYLE[2]!
  const xs = points.map((p) => p.x).sort((a, b) => a - b)
  const ys = points.map((p) => p.y).sort((a, b) => a - b)
  const zs = points.map((p) => p.z).sort((a, b) => a - b)
  const minX = percentile(xs, 0.04)
  const maxX = percentile(xs, 0.96)
  const minY = percentile(ys, 0.04)
  const maxY = percentile(ys, 0.96)
  const minZ = percentile(zs, 0.05)
  const maxZ = percentile(zs, 0.95)
  const meshes: GlassMeshPrimitive[] = []

  const panels: Array<{ id: string; quad: Parameters<typeof pushQuad>[1][]; normal: [number, number, number] }> = [
    {
      id: "wall-x-min",
      quad: [
        [minX, minY, minZ],
        [minX, maxY, minZ],
        [minX, maxY, maxZ],
        [minX, minY, maxZ],
      ],
      normal: [-1, 0, 0],
    },
    {
      id: "wall-x-max",
      quad: [
        [maxX, minY, minZ],
        [maxX, maxY, minZ],
        [maxX, maxY, maxZ],
        [maxX, minY, maxZ],
      ],
      normal: [1, 0, 0],
    },
    {
      id: "wall-y-min",
      quad: [
        [minX, minY, minZ],
        [maxX, minY, minZ],
        [maxX, minY, maxZ],
        [minX, minY, maxZ],
      ],
      normal: [0, -1, 0],
    },
    {
      id: "wall-y-max",
      quad: [
        [minX, maxY, minZ],
        [maxX, maxY, minZ],
        [maxX, maxY, maxZ],
        [minX, maxY, maxZ],
      ],
      normal: [0, 1, 0],
    },
  ]

  for (const panel of panels) {
    const buf: MeshBuffers = { positions: [], normals: [], indices: [] }
    const [a, b, c, d] = panel.quad
    pushQuad(buf, a, b, c, d, panel.normal)
    meshes.push({
      id: panel.id,
      semanticId: 2,
      name: panel.id,
      color: style.color,
      opacity: style.opacity,
      ...buf,
    })
  }

  return meshes
}

function verticalWallMeshes(points: Point3[]): GlassMeshPrimitive[] {
  const style = STRUCTURE_GLASS_STYLE[2]!
  const meshes: GlassMeshPrimitive[] = []
  let pool = samplePoints(points, 12000)
  let panel = 0

  while (pool.length >= 500 && panel < 14) {
    const fit = ransacPlane(pool, {
      iterations: 280,
      threshold: 0.1,
      minInliers: 350,
      isValidPlane: (plane) => Math.abs(plane.normal[2]) < 0.4,
    })
    if (!fit) break

    const inlierSet = new Set(fit.inlierIndices)
    const inliers = fit.inlierIndices.map((i) => pool[i]!)
    const { u, v } = planeBasis(fit.plane.normal)

    let minU = Infinity
    let maxU = -Infinity
    let minV = Infinity
    let maxV = -Infinity
    for (const p of inliers) {
      const [pu, pv] = projectToPlaneUV(p, fit.plane, u, v)
      minU = Math.min(minU, pu)
      maxU = Math.max(maxU, pu)
      minV = Math.min(minV, pv)
      maxV = Math.max(maxV, pv)
    }

    if (maxU - minU < 0.35 || maxV - minV < 0.35) {
      pool = pool.filter((_, idx) => !inlierSet.has(idx))
      continue
    }

    const padU = (maxU - minU) * 0.02
    const padV = (maxV - minV) * 0.02
    minU -= padU
    maxU += padU
    minV -= padV
    maxV += padV

    const a = cornerFromPlaneUV(fit.plane, u, v, minU, minV)
    const b = cornerFromPlaneUV(fit.plane, u, v, maxU, minV)
    const c = cornerFromPlaneUV(fit.plane, u, v, maxU, maxV)
    const d = cornerFromPlaneUV(fit.plane, u, v, minU, maxV)

    const buf: MeshBuffers = { positions: [], normals: [], indices: [] }
    pushQuad(buf, a, b, c, d, fit.plane.normal)

    meshes.push({
      id: `wall-${panel}`,
      semanticId: 2,
      name: `Wall ${panel + 1}`,
      color: style.color,
      opacity: style.opacity,
      ...buf,
    })

    pool = pool.filter((_, idx) => !inlierSet.has(idx))
    panel++
  }

  if (meshes.length < 2) {
    return bboxFallbackWalls(points)
  }

  return meshes
}

export function buildGlassStructureMeshes(
  cloud: FacilityPointCloud,
  dataId = "1",
): GlassMeshDocument {
  const meshes: GlassMeshPrimitive[] = []

  const floor = collectSemanticPoints(cloud, 1)
  const ceiling = collectSemanticPoints(cloud, 0)
  const walls = collectSemanticPoints(cloud, 2)

  const floorMesh = horizontalGlassMesh("floor", 1, floor, "low")
  if (floorMesh) meshes.push(floorMesh)

  const ceilingMesh = horizontalGlassMesh("ceiling", 0, ceiling, "high")
  if (ceilingMesh) meshes.push(ceilingMesh)

  meshes.push(...verticalWallMeshes(walls))

  return {
    version: 1,
    dataId,
    source: `app/api/data${dataId}.npy`,
    generatedAt: new Date().toISOString(),
    replacedSemantics: [...GLASS_STRUCTURE_SEMANTICS],
    meshes,
  }
}

export function glassMeshToGpu(mesh: GlassMeshPrimitive) {
  return {
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    indices: new Uint32Array(mesh.indices),
  }
}
