import type { FacilityPointCloud, TabularPointLayout } from "./types"

function resolvePointCount(shape: readonly number[], stride: number): number {
  if (shape.length === 0) {
    throw new Error("NPY shape is empty")
  }
  if (shape.length === 1) {
    const flat = shape[0]!
    if (flat % stride !== 0) {
      throw new Error(`Flat length ${flat} is not divisible by stride ${stride}`)
    }
    return flat / stride
  }
  if (shape.length === 2) {
    const [a, b] = shape
    if (a === stride) {
      throw new Error(
        "Detected (stride, N) shape. Use row-major (N, stride) in NumPy (points along axis 0) or reshape before loading.",
      )
    }
    if (b === stride) {
      return a!
    }
    throw new Error(`Expected (*, ${stride}) or flat array, got [${shape.join(", ")}]`)
  }
  throw new Error(`Unsupported rank ${shape.length}: [${shape.join(", ")}]`)
}

function rgbToUint8(
  r: number,
  g: number,
  b: number,
  mode: NonNullable<TabularPointLayout["colorEncoding"]>,
): [number, number, number] {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

  if (mode === "float01") {
    return [clamp(r * 255), clamp(g * 255), clamp(b * 255)]
  }
  if (mode === "uint8") {
    return [clamp(r), clamp(g), clamp(b)]
  }
  // auto: treat as float01 if all channels in [0, 1], else as 0–255 scalars
  const looks01 = r <= 1 && g <= 1 && b <= 1 && r >= 0 && g >= 0 && b >= 0
  if (looks01) {
    return [clamp(r * 255), clamp(g * 255), clamp(b * 255)]
  }
  return [clamp(r), clamp(g), clamp(b)]
}

/**
 * Converts a row-major tabular buffer (e.g. NumPy (N,7)) into the canonical `FacilityPointCloud`.
 */
export function tabularToFacilityPointCloud(
  raw: ArrayLike<number>,
  shape: readonly number[],
  layout: TabularPointLayout,
  meta?: Record<string, unknown>,
): FacilityPointCloud {
  const stride = layout.stride
  const n = resolvePointCount(shape, stride)
  const expected = n * stride
  if (raw.length < expected) {
    throw new Error(`Buffer length ${raw.length} < expected ${expected} for ${n} points`)
  }

  const [ix, iy, iz] = layout.position
  const [ir, ig, ib] = layout.color
  const isem = layout.semanticId
  const colorMode = layout.colorEncoding ?? "auto"

  const positions = new Float32Array(n * 3)
  const colors = new Uint8Array(n * 3)
  const semanticIds = new Uint32Array(n)
  const interleaved = new Float32Array(n * 7)

  for (let i = 0; i < n; i++) {
    const o = i * stride
    const base7 = i * 7
    const x = Number(raw[o + ix]!)
    const y = Number(raw[o + iy]!)
    const z = Number(raw[o + iz]!)
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    interleaved[base7] = x
    interleaved[base7 + 1] = y
    interleaved[base7 + 2] = z
    const [cr, cg, cb] = rgbToUint8(
      Number(raw[o + ir]!),
      Number(raw[o + ig]!),
      Number(raw[o + ib]!),
      colorMode,
    )
    colors[i * 3] = cr
    colors[i * 3 + 1] = cg
    colors[i * 3 + 2] = cb
    interleaved[base7 + 3] = cr / 255
    interleaved[base7 + 4] = cg / 255
    interleaved[base7 + 5] = cb / 255
    const sem = Math.max(0, Math.round(Number(raw[o + isem]!)))
    semanticIds[i] = sem
    interleaved[base7 + 6] = sem
  }

  return { pointCount: n, interleaved, positions, colors, semanticIds, meta }
}
