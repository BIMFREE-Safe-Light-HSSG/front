/**
 * NumPy `.npy` binary is parsed with loaders.gl’s NPY loader from `@loaders.gl/textures`
 * (there is no published `@loaders.gl/numpy` package on npm; this is the supported path).
 */
import { parseSync } from "@loaders.gl/core"
import { NPYLoader } from "@loaders.gl/textures"

import { FACILITY_XYZ_RGB_SEMANTIC_ROW } from "./layout-presets"
import { tabularToFacilityPointCloud } from "./normalize-tabular"
import type { FacilityPointCloud, TabularPointLayout } from "./types"
import type { FacilityPointCloudSource } from "./source"

export type LoadFacilityNpyOptions = {
  layout?: TabularPointLayout
  meta?: Record<string, unknown>
}

export function parseFacilityPointCloudNpy(
  arrayBuffer: ArrayBuffer,
  options: LoadFacilityNpyOptions = {},
): FacilityPointCloud {
  const layout = options.layout ?? FACILITY_XYZ_RGB_SEMANTIC_ROW
  const { data, header } = parseSync(arrayBuffer, NPYLoader) as {
    data: ArrayLike<number>
    header: { shape: number[]; descr: string }
  }
  return tabularToFacilityPointCloud(data, header.shape, layout, {
    npyDescr: header.descr,
    ...options.meta,
  })
}

export class NpyUrlFacilitySource implements FacilityPointCloudSource {
  readonly kind = "npy-url"

  constructor(
    private readonly url: string,
    private readonly options: LoadFacilityNpyOptions = {},
  ) {}

  load(): Promise<FacilityPointCloud> {
    return loadFacilityPointCloudNpy(this.url, this.options)
  }
}

export async function loadFacilityPointCloudNpy(
  url: string,
  options: LoadFacilityNpyOptions = {},
): Promise<FacilityPointCloud> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch NPY: ${res.status} ${res.statusText}`)
  }
  return parseFacilityPointCloudNpy(await res.arrayBuffer(), options)
}
