import type { TabularPointLayout } from "./types"

/** Default: one row = [x, y, z, r, g, b, semantic_id] */
export const FACILITY_XYZ_RGB_SEMANTIC_ROW: TabularPointLayout = {
  stride: 7,
  position: [0, 1, 2],
  color: [3, 4, 5],
  semanticId: 6,
  colorEncoding: "auto",
}
