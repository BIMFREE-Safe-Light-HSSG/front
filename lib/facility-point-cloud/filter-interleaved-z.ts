/** One point = 7 floats in `FacilityPointCloud.interleaved`. */
const FLOATS_PER_POINT = 7

/**
 * Copies interleaved rows where `z <= zMax` into a dense buffer (plan view / ceiling clip).
 * Returns the original buffer reference if nothing is removed.
 */
export function filterInterleavedByMaxZ(
  interleaved: Float32Array,
  pointCount: number,
  zMax: number,
): { interleaved: Float32Array; pointCount: number } {
  if (pointCount <= 0) {
    return { interleaved, pointCount: 0 }
  }

  let keep = 0
  for (let i = 0; i < pointCount; i++) {
    const z = interleaved[i * FLOATS_PER_POINT + 2]!
    if (z <= zMax) {
      keep++
    }
  }

  if (keep === pointCount) {
    return { interleaved, pointCount }
  }

  const out = new Float32Array(keep * FLOATS_PER_POINT)
  let w = 0
  for (let i = 0; i < pointCount; i++) {
    const o = i * FLOATS_PER_POINT
    if (interleaved[o + 2]! <= zMax) {
      out.set(interleaved.subarray(o, o + FLOATS_PER_POINT), w)
      w += FLOATS_PER_POINT
    }
  }
  return { interleaved: out, pointCount: keep }
}
