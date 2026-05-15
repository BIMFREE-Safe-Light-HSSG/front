import { cross, dot, normalize, subtract, type Vec3 } from "@/lib/facility-mesh/geometry"

export type Plane = {
  normal: Vec3
  d: number
}

export type Point3 = { x: number; y: number; z: number }

function planeFromPoints(p1: Point3, p2: Point3, p3: Point3): Plane | null {
  const v1 = subtract([p2.x, p2.y, p2.z], [p1.x, p1.y, p1.z])
  const v2 = subtract([p3.x, p3.y, p3.z], [p1.x, p1.y, p1.z])
  const n = cross(v1, v2)
  const len = Math.hypot(n[0], n[1], n[2])
  if (len < 1e-8) return null
  const normal = normalize(n)
  const d = dot(normal, [p1.x, p1.y, p1.z])
  return { normal, d }
}

export function pointPlaneDistance(p: Point3, plane: Plane): number {
  return Math.abs(dot(plane.normal, [p.x, p.y, p.z]) - plane.d)
}

export function ransacPlane(
  points: Point3[],
  options: {
    iterations?: number
    threshold?: number
    minInliers?: number
    isValidPlane?: (plane: Plane) => boolean
  } = {},
): { plane: Plane; inlierIndices: number[] } | null {
  const iterations = options.iterations ?? 180
  const threshold = options.threshold ?? 0.07
  const minInliers = options.minInliers ?? 400
  const isValidPlane = options.isValidPlane ?? (() => true)

  if (points.length < 3) return null

  let bestPlane: Plane | null = null
  let bestInliers: number[] = []

  for (let it = 0; it < iterations; it++) {
    const i1 = Math.floor(Math.random() * points.length)
    let i2 = Math.floor(Math.random() * points.length)
    let i3 = Math.floor(Math.random() * points.length)
    if (i2 === i1) i2 = (i2 + 1) % points.length
    if (i3 === i1 || i3 === i2) i3 = (i3 + 2) % points.length

    const plane = planeFromPoints(points[i1]!, points[i2]!, points[i3]!)
    if (!plane || !isValidPlane(plane)) continue

    const inliers: number[] = []
    for (let i = 0; i < points.length; i++) {
      if (pointPlaneDistance(points[i]!, plane) <= threshold) {
        inliers.push(i)
      }
    }

    if (inliers.length > bestInliers.length) {
      bestInliers = inliers
      bestPlane = plane
    }
  }

  if (!bestPlane || bestInliers.length < minInliers) return null
  return { plane: bestPlane, inlierIndices: bestInliers }
}

export function planeBasis(normal: Vec3): { u: Vec3; v: Vec3 } {
  const n = normalize(normal)
  const ref: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]
  const u = normalize(cross(ref, n))
  const v = cross(n, u)
  return { u, v }
}

export function projectToPlaneUV(p: Point3, plane: Plane, u: Vec3, v: Vec3): [number, number] {
  const pt: Vec3 = [p.x, p.y, p.z]
  const onPlane = subtract(pt, scale(plane.normal, dot(plane.normal, pt) - plane.d))
  return [dot(onPlane, u), dot(onPlane, v)]
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

export function cornerFromPlaneUV(
  plane: Plane,
  u: Vec3,
  v: Vec3,
  uVal: number,
  vVal: number,
): Vec3 {
  const base = scale(plane.normal, plane.d)
  return addVec(base, addVec(scale(u, uVal), scale(v, vVal)))
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
