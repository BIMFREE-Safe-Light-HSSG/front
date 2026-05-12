/**
 * Placeholder for `.obj` (+ optional semantic/material) integration.
 * Mesh layers (SimpleMeshLayer / ScenegraphLayer) can consume OBJ separately;
 * keep point semantics in `FacilityPointCloud` so the viewer contract stays one shape.
 */
export type FacilityObjSemanticHandle = {
  /** Resolved when OBJ pipeline is wired up */
  url: string
}

export function createObjSemanticPlaceholder(url: string): FacilityObjSemanticHandle {
  return { url }
}
