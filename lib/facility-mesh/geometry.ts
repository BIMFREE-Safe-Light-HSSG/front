export type Vec3 = [number, number, number]

export function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))
  return sorted[idx]!
}

export type MeshBuffers = {
  positions: number[]
  normals: number[]
  indices: number[]
}

export function pushQuad(
  out: MeshBuffers,
  a: Vec3,
  b: Vec3,
  c: Vec3,
  d: Vec3,
  normal: Vec3,
): void {
  const base = out.positions.length / 3
  const n = normalize(normal)
  for (const p of [a, b, c, d]) {
    out.positions.push(p[0], p[1], p[2])
    out.normals.push(n[0], n[1], n[2])
  }
  out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
}

export function pushTriangle(out: MeshBuffers, a: Vec3, b: Vec3, c: Vec3, normal: Vec3): void {
  const base = out.positions.length / 3
  const n = normalize(normal)
  for (const p of [a, b, c]) {
    out.positions.push(p[0], p[1], p[2])
    out.normals.push(n[0], n[1], n[2])
  }
  out.indices.push(base, base + 1, base + 2)
}
