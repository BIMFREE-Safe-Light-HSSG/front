import type { AssetStatus, SceneGraphSkeleton, Vec3 } from "./types"

export type CreateAssetPayload = {
  class: string
  position: Vec3
  status?: AssetStatus
  id?: string
}

export async function fetchSceneGraphSkeleton(signal?: AbortSignal): Promise<SceneGraphSkeleton> {
  const res = await fetch("/api/scene-graph-skeleton", { cache: "no-store", signal })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `${res.status}`)
  }
  return (await res.json()) as SceneGraphSkeleton
}

export async function createSceneGraphAsset(payload: CreateAssetPayload): Promise<SceneGraphSkeleton> {
  const res = await fetch("/api/scene-graph-skeleton/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body = (await res.json()) as SceneGraphSkeleton | { error?: string }
  if (!res.ok) {
    throw new Error("error" in body && body.error ? body.error : `${res.status}`)
  }
  return body as SceneGraphSkeleton
}

export async function deleteSceneGraphAsset(assetId: string): Promise<SceneGraphSkeleton> {
  const res = await fetch(`/api/scene-graph-skeleton/assets?id=${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  })
  const body = (await res.json()) as SceneGraphSkeleton | { error?: string }
  if (!res.ok) {
    throw new Error("error" in body && body.error ? body.error : `${res.status}`)
  }
  return body as SceneGraphSkeleton
}
