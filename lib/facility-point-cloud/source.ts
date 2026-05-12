import type { FacilityPointCloud } from "./types"

/**
 * Strategy boundary: swap implementations (NPY now, fused OBJ+points later)
 * without changing the viewer or Deck layers.
 */
export interface FacilityPointCloudSource {
  readonly kind: string
  load(): Promise<FacilityPointCloud>
}
