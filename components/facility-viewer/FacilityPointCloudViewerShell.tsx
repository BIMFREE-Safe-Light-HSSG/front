"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { LiquidGlassPageShell } from "@/components/layout/liquid-glass-page-shell"
import { LiquidGlassSectionHeader } from "@/components/layout/liquid-glass-section-header"
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
  dataId: FacilityDataId | null
}

export function FacilityPointCloudViewerShell({ dataId }: FacilityPointCloudViewerShellProps) {
  const [cloud, setCloud] = useState<FacilityPointCloud | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadFromApi = useCallback(async (id: FacilityDataId, signal?: AbortSignal) => {
    const res = await fetch(pointcloudUrl(id), { cache: "no-store", signal })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `${res.status} ${res.statusText}`)
    }
    const buf = await res.arrayBuffer()
    return parseFacilityPointCloudNpy(buf, {
      meta: { fileName: `data${id}.npy`, source: "api/pointcloud", dataId: id },
    })
  }, [])

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
      <LiquidGlassPageShell maxWidth="lg" centered>
        <p className="text-destructive text-sm">{error}</p>
        <Button asChild className="mt-4 rounded-full" variant="outline">
          <Link href="/viewer">목록으로</Link>
        </Button>
      </LiquidGlassPageShell>
    )
  }

  return (
    <LiquidGlassPageShell maxWidth="full" glass={false} className="pb-8">
      <div className="mx-auto w-full max-w-[1400px] px-2 md:px-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 h-9 rounded-full px-3 text-xs font-bold tracking-widest text-red-900/70 uppercase hover:bg-red-50 hover:text-red-950"
        >
          <Link href="/viewer">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            시설 목록
          </Link>
        </Button>

        <LiquidGlassSectionHeader
          eyebrow={`Dataset ${dataId}`}
          title={
            <>
              Spatial <span className="text-red-800/25 [-webkit-text-stroke:1px_#991b1b]">Viewer</span>
            </>
          }
          description={
            <>
              소스 <code className="font-mono text-xs text-red-900/80">{pointcloudUrl(dataId)}</code> · 행{" "}
              <code className="font-mono text-xs">[x, y, z, r, g, b, semantic_id]</code>
            </>
          }
          className="mb-6"
        />

        {error ? (
          <p className="text-destructive mb-4 text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-[2rem] border border-red-900/10 bg-white/40 shadow-[0_20px_40px_rgba(153,27,27,0.08)] backdrop-blur-sm">
          <FacilityPointCloudDeck cloud={cloud} pointSize={2} className="min-h-[65vh] border-0 shadow-none" />
        </div>
      </div>
    </LiquidGlassPageShell>
  )
}
