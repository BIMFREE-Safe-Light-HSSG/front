"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { parseFacilityPointCloudNpy } from "@/lib/facility-point-cloud/load-npy"
import type { FacilityDataId } from "@/lib/facility-list-types"
import type { FacilityPointCloud } from "@/lib/facility-point-cloud/types"

const FacilityPointCloudDeck = dynamic(
  () =>
    import("@/components/facility-viewer/FacilityPointCloudDeck").then((m) => m.FacilityPointCloudDeck),
  { ssr: false },
)

function pointcloudUrl(dataId: FacilityDataId) {
  return `/api/pointcloud/${dataId}`
}

export type FacilityPointCloudViewerShellProps = {
  /** `null`이면 잘못된 URL — 안내와 목록 링크만 표시 */
  dataId: FacilityDataId | null
}

export function FacilityPointCloudViewerShell({ dataId }: FacilityPointCloudViewerShellProps) {
  const [cloud, setCloud] = useState<FacilityPointCloud | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadFromApi = useCallback(
    async (id: FacilityDataId, signal?: AbortSignal) => {
      const res = await fetch(pointcloudUrl(id), { cache: "no-store", signal })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `${res.status} ${res.statusText}`)
      }
      const buf = await res.arrayBuffer()
      return parseFacilityPointCloudNpy(buf, {
        meta: { fileName: `data${id}.npy`, source: "api/pointcloud", dataId: id },
      })
    },
    [],
  )

  useEffect(() => {
    if (!dataId) {
      setCloud(null)
      setError("잘못된 경로입니다. dataId는 1, 2, 3 중 하나여야 합니다.")
      return
    }
    const ac = new AbortController()
    setError(null)
    loadFromApi(dataId, ac.signal)
      .then((c) => {
        if (!ac.signal.aborted) {
          setCloud(c)
        }
      })
      .catch((e) => {
        if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
          return
        }
        setCloud(null)
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => ac.abort()
  }, [dataId, loadFromApi])

  if (!dataId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive text-sm">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/viewer">목록으로</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 h-8 px-2">
          <Link href="/viewer">← 시설 목록</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">데이터 {dataId}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          소스: <code className="text-xs">{pointcloudUrl(dataId)}</code> · 행 형식{" "}
          <code className="text-xs">[x, y, z, r, g, b, semantic_id]</code>
        </p>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <FacilityPointCloudDeck cloud={cloud} pointSize={2} />
    </div>
  )
}
