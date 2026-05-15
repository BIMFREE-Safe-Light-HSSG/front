export type GlassMeshPrimitive = {
  id: string
  semanticId: number
  name: string
  color: [number, number, number]
  opacity: number
  positions: number[]
  normals: number[]
  indices: number[]
}

export type GlassMeshDocument = {
  version: 1
  dataId: string
  source: string
  generatedAt: string
  replacedSemantics: number[]
  meshes: GlassMeshPrimitive[]
}
