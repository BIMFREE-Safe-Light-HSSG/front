/**
 * Canonical GPU-friendly representation for facility point clouds.
 * All loaders/adapters normalize into this shape so Deck.gl layers stay stable.
 */
export type FacilityPointCloud = {
  pointCount: number
  /**
   * Single interleaved buffer per point: `[x, y, z, r, g, b, semantic]` as Float32.
   * RGB channels are 0–1 (shader-ready). Semantic is stored as a float for GPU stride alignment.
   */
  interleaved: Float32Array
  positions: Float32Array
  /** RGB per point, 0–255 (CPU / picking helpers) */
  colors: Uint8Array
  semanticIds: Uint32Array
  meta?: Record<string, unknown>
}

/** Column indices within one logical point row in the source table (row-major). */
export type TabularPointLayout = {
  stride: number
  position: readonly [number, number, number]
  color: readonly [number, number, number]
  semanticId: number
  /** How RGB columns should be interpreted when converting to Uint8 */
  colorEncoding?: "auto" | "uint8" | "float01"
}
