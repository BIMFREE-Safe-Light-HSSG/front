import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { collectAssets } from "./assets"
import type { AssetStatus, SceneGraphSkeleton, SkeletonAsset, Vec3, ZoneNode } from "./types"

export const SKELETON_PATH = path.join(process.cwd(), "app", "api", "scene_graph_skeleton.json")

export async function readSkeletonFile(): Promise<SceneGraphSkeleton> {
  const raw = await readFile(SKELETON_PATH, "utf8")
  return JSON.parse(raw) as SceneGraphSkeleton
}

export async function writeSkeletonFile(doc: SceneGraphSkeleton): Promise<void> {
  const json = `${JSON.stringify(doc, null, 2)}\n`
  await writeFile(SKELETON_PATH, json, "utf8")
}

export function allAssetIds(doc: SceneGraphSkeleton): Set<string> {
  return new Set(collectAssets(doc).map((a) => a.id))
}

export function generateAssetId(doc: SceneGraphSkeleton): string {
  const ids = allAssetIds(doc)
  let n = 1
  while (ids.has(`ASSET_EXT_${String(n).padStart(3, "0")}`)) {
    n++
  }
  return `ASSET_EXT_${String(n).padStart(3, "0")}`
}

export function validatePosition(position: unknown): position is Vec3 {
  if (!Array.isArray(position) || position.length < 3) return false
  return position.every((v) => typeof v === "number" && Number.isFinite(v))
}

export function addAssetToDocument(
  doc: SceneGraphSkeleton,
  input: { class: string; position: Vec3; status?: AssetStatus; id?: string },
): { doc: SceneGraphSkeleton; asset: SkeletonAsset } {
  const cls = input.class.trim()
  if (!cls) {
    throw new Error("class is required")
  }
  if (!validatePosition(input.position)) {
    throw new Error("position must be [x, y, z] numbers")
  }

  const ids = allAssetIds(doc)
  const id = input.id?.trim() || generateAssetId(doc)
  if (ids.has(id)) {
    throw new Error(`asset id already exists: ${id}`)
  }

  const asset: SkeletonAsset = {
    id,
    class: cls,
    position: [input.position[0], input.position[1], input.position[2]],
    ...(input.status ? { status: input.status } : {}),
  }

  if (!doc.scene_graph.assets) {
    doc.scene_graph.assets = []
  }
  doc.scene_graph.assets.push(asset)

  return { doc, asset }
}

export function removeAssetFromDocument(doc: SceneGraphSkeleton, assetId: string): SceneGraphSkeleton {
  const id = assetId.trim()
  if (!id) {
    throw new Error("asset id is required")
  }

  const before = allAssetIds(doc).size
  if (doc.scene_graph.assets) {
    doc.scene_graph.assets = doc.scene_graph.assets.filter((a) => a.id !== id)
  }

  for (const node of doc.scene_graph.nodes) {
    if (node.type !== "ZONE") continue
    const zone = node as ZoneNode
    if (zone.assets?.length) {
      zone.assets = zone.assets.filter((a) => a.id !== id)
    }
  }

  const after = allAssetIds(doc).size
  if (after === before) {
    throw new Error(`asset not found: ${id}`)
  }

  return doc
}
