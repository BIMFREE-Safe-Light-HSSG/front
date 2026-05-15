/** One point = 7 floats; semantic is float slot index 6. */
const FLOATS_PER_POINT = 7
const SEMANTIC_SLOT = 6

/**
 * Parse user input: comma / space / semicolon separated non‑negative integers.
 * Returns `null` when empty → no filter (show all).
 */
export function parseSemanticIdList(input: string): Set<number> | null {
  const set = new Set<number>()
  for (const part of input.trim().split(/[\s,;]+/).filter(Boolean)) {
    const n = Number(part)
    if (!Number.isFinite(n)) {
      continue
    }
    const k = Math.trunc(n)
    if (k >= 0 && k === n) {
      set.add(k)
    }
  }
  return set.size > 0 ? set : null
}

export function filterInterleavedBySemanticSet(
  interleaved: Float32Array,
  pointCount: number,
  allowed: ReadonlySet<number>,
): { interleaved: Float32Array; pointCount: number } {
  if (pointCount <= 0) {
    return { interleaved, pointCount: 0 }
  }

  let keep = 0
  for (let i = 0; i < pointCount; i++) {
    const o = i * FLOATS_PER_POINT
    const sem = Math.round(interleaved[o + SEMANTIC_SLOT]!)
    if (allowed.has(sem)) {
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
    const sem = Math.round(interleaved[o + SEMANTIC_SLOT]!)
    if (allowed.has(sem)) {
      out.set(interleaved.subarray(o, o + FLOATS_PER_POINT), w)
      w += FLOATS_PER_POINT
    }
  }
  return { interleaved: out, pointCount: keep }
}

export function filterInterleavedExcludingSemanticSet(
  interleaved: Float32Array,
  pointCount: number,
  excluded: ReadonlySet<number>,
): { interleaved: Float32Array; pointCount: number } {
  if (pointCount <= 0 || excluded.size === 0) {
    return { interleaved, pointCount }
  }

  let keep = 0
  for (let i = 0; i < pointCount; i++) {
    const o = i * FLOATS_PER_POINT
    const sem = Math.round(interleaved[o + SEMANTIC_SLOT]!)
    if (!excluded.has(sem)) {
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
    const sem = Math.round(interleaved[o + SEMANTIC_SLOT]!)
    if (!excluded.has(sem)) {
      out.set(interleaved.subarray(o, o + FLOATS_PER_POINT), w)
      w += FLOATS_PER_POINT
    }
  }
  return { interleaved: out, pointCount: keep }
}

/** id → point count, single pass. */
export function histogramSemanticIds(semanticIds: Uint32Array): Map<number, number> {
  const m = new Map<number, number>()
  for (let i = 0; i < semanticIds.length; i++) {
    const id = semanticIds[i]!
    m.set(id, (m.get(id) ?? 0) + 1)
  }
  return m
}
