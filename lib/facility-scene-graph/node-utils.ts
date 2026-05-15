import type { FacilitySceneGraphBounds, FacilitySceneNode, FacilitySceneTransform } from "./types"

const CLASS_SEMANTIC_ID: Record<string, number> = {
  Ceiling: 0,
  Floor: 1,
  Wall: 2,
  Beam: 3,
  Column: 4,
  Window: 5,
  Door: 6,
  Chair: 7,
  Table: 8,
  Bookcase: 9,
  Sofa: 10,
  Board: 11,
  Clutter: 12,
}

const CLASS_COLORS: Record<string, [number, number, number]> = {
  Space: [160, 160, 160],
  Ceiling: [255, 80, 80],
  Floor: [80, 220, 120],
  Wall: [80, 120, 255],
  Beam: [255, 220, 80],
  Column: [220, 80, 220],
  Window: [80, 220, 220],
  Door: [180, 180, 80],
  Chair: [160, 80, 160],
  Table: [80, 160, 160],
  Bookcase: [140, 140, 140],
  Sofa: [90, 90, 90],
  Board: [200, 200, 200],
  Ceiling_Utility: [255, 180, 80],
  Clutter: [240, 240, 240],
}

export type SceneGraphGroupKey = "structure" | "openings" | "furniture" | "assets" | "other"

export const SCENE_GRAPH_GROUPS: Array<{ key: SceneGraphGroupKey; label: string; classes: string[] }> = [
  {
    key: "structure",
    label: "Structure",
    classes: ["Ceiling", "Floor", "Wall", "Beam", "Column"],
  },
  { key: "openings", label: "Openings", classes: ["Window", "Door"] },
  {
    key: "furniture",
    label: "Furniture",
    classes: ["Chair", "Table", "Bookcase", "Sofa", "Board"],
  },
  { key: "assets", label: "Ceiling Assets", classes: ["Ceiling_Utility"] },
  { key: "other", label: "Other", classes: ["Clutter", "Space"] },
]

export function semanticIdForClass(className: string): number | undefined {
  return CLASS_SEMANTIC_ID[className]
}

export function colorForClass(className: string): [number, number, number] {
  return CLASS_COLORS[className] ?? [150, 150, 150]
}

export function boundsFromTransform(transform: FacilitySceneTransform): FacilitySceneGraphBounds {
  const [cx, cy, cz] = transform.position
  const [sx, sy, sz] = transform.scale
  const hx = sx / 2
  const hy = sy / 2
  const hz = sz / 2
  return {
    min: [cx - hx, cy - hy, cz - hz],
    max: [cx + hx, cy + hy, cz + hz],
    center: [cx, cy, cz],
  }
}

export function nodeBounds(node: FacilitySceneNode): FacilitySceneGraphBounds | null {
  if (!node.transform) return null
  return boundsFromTransform(node.transform)
}

export function findSceneNode(root: FacilitySceneNode, id: string): FacilitySceneNode | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findSceneNode(child, id)
    if (found) return found
  }
  return null
}

export function flattenSceneNodes(root: FacilitySceneNode): FacilitySceneNode[] {
  const out: FacilitySceneNode[] = [root]
  for (const child of root.children ?? []) {
    out.push(...flattenSceneNodes(child))
  }
  return out
}

export function groupRootChildren(root: FacilitySceneNode): Array<{
  key: SceneGraphGroupKey
  label: string
  nodes: FacilitySceneNode[]
}> {
  const children = root.children ?? []
  return SCENE_GRAPH_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    nodes: children.filter((n) => group.classes.includes(n.class)),
  })).filter((g) => g.nodes.length > 0)
}

export function bboxEdgePaths(bounds: FacilitySceneGraphBounds): [number, number, number][][] {
  const [minX, minY, minZ] = bounds.min
  const [maxX, maxY, maxZ] = bounds.max
  return [
    [
      [minX, minY, minZ],
      [maxX, minY, minZ],
      [maxX, maxY, minZ],
      [minX, maxY, minZ],
      [minX, minY, minZ],
    ],
    [
      [minX, minY, maxZ],
      [maxX, minY, maxZ],
      [maxX, maxY, maxZ],
      [minX, maxY, maxZ],
      [minX, minY, maxZ],
    ],
    [
      [minX, minY, minZ],
      [minX, minY, maxZ],
    ],
    [
      [maxX, minY, minZ],
      [maxX, minY, maxZ],
    ],
    [
      [maxX, maxY, minZ],
      [maxX, maxY, maxZ],
    ],
    [
      [minX, maxY, minZ],
      [minX, maxY, maxZ],
    ],
  ]
}
