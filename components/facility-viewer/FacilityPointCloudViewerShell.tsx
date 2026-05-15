"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { FacilitySceneGraphPanel } from "@/components/facility-viewer/FacilitySceneGraphPanel"
import { LiquidGlassPageShell } from "@/components/layout/liquid-glass-page-shell"
import { LiquidGlassSectionHeader } from "@/components/layout/liquid-glass-section-header"
import { Button } from "@/components/ui/button"
import { parseFacilityPointCloudNpy } from "@/lib/facility-point-cloud/load-npy"
import { buildGlassStructureMeshes } from "@/lib/facility-mesh/build-glass-structure"
import type { GlassMeshDocument } from "@/lib/facility-mesh/types"
import type { FacilitySceneGraphDocument, FacilitySceneNode } from "@/lib/facility-scene-graph/types"
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

function glassMeshUrl(dataId: FacilityDataId) {
  return `/api/glass-mesh/${dataId}`
}

function sceneGraphUrl(dataId: FacilityDataId) {
  return `/api/scene-graph/${dataId}`
}

export type FacilityPointCloudViewerShellProps = {
  dataId: FacilityDataId | null
}

export function FacilityPointCloudViewerShell({ dataId }: FacilityPointCloudViewerShellProps) {
  const [cloud, setCloud] = useState<FacilityPointCloud | null>(null)
  const [glassMesh, setGlassMesh] = useState<GlassMeshDocument | null>(null)
  const [sceneGraph, setSceneGraph] = useState<FacilitySceneGraphDocument | null>(null)
  const [sceneGraphLoading, setSceneGraphLoading] = useState(false)
  const [sceneGraphError, setSceneGraphError] = useState<string | null>(null)
  const [selectedSceneNode, setSelectedSceneNode] = useState<FacilitySceneNode | null>(null)
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
      setGlassMesh(null)
      setSceneGraph(null)
      setSelectedSceneNode(null)
      setError("잘못된 경로입니다. dataId는 1, 2, 3 중 하나여야 합니다.")
      return
    }
    const ac = new AbortController()
    setError(null)
    setGlassMesh(null)
    setSceneGraph(null)
    setSelectedSceneNode(null)
    setSceneGraphLoading(true)
    setSceneGraphError(null)

    loadFromApi(dataId, ac.signal)
      .then(async (c) => {
        if (ac.signal.aborted) return
        setCloud(c)
        try {
          const res = await fetch(glassMeshUrl(dataId), { cache: "no-store", signal: ac.signal })
          if (res.ok) {
            setGlassMesh((await res.json()) as GlassMeshDocument)
          } else if (!ac.signal.aborted) {
            setGlassMesh(buildGlassStructureMeshes(c, dataId))
          }
        } catch {
          if (!ac.signal.aborted) {
            setGlassMesh(buildGlassStructureMeshes(c, dataId))
          }
        }
      })
      .catch((e) => {
        if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
          return
        }
        setCloud(null)
        setGlassMesh(null)
        setError(e instanceof Error ? e.message : String(e))
      })

    fetch(sceneGraphUrl(dataId), { cache: "no-store", signal: ac.signal })
      .then(async (res) => {
        if (ac.signal.aborted) return
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `${res.status}`)
        }
        setSceneGraph((await res.json()) as FacilitySceneGraphDocument)
      })
      .catch((e) => {
        if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
          return
        }
        setSceneGraph(null)
        setSceneGraphError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setSceneGraphLoading(false)
        }
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
      <div className="mx-auto w-full max-w-[1600px] px-2 md:px-4">
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
              포인트 <code className="font-mono text-xs text-red-900/80">{pointcloudUrl(dataId)}</code> · 씬 그래프{" "}
              <code className="font-mono text-xs text-red-900/80">{sceneGraphUrl(dataId)}</code>
            </>
          }
          className="mb-6"
        />

        {error ? (
          <p className="text-destructive mb-4 text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-[2rem] border border-red-900/10 bg-white/40 shadow-[0_20px_40px_rgba(153,27,27,0.08)] backdrop-blur-sm">
            <FacilityPointCloudDeck
              cloud={cloud}
              glassMesh={glassMesh}
              selectedSceneNode={selectedSceneNode}
              onClearSceneSelection={() => setSelectedSceneNode(null)}
              pointSize={2}
              className="min-h-[65vh] border-0 bg-gradient-to-b from-slate-100/80 to-slate-200/40 shadow-none"
            />
          </div>

          <FacilitySceneGraphPanel
            sceneGraph={sceneGraph}
            loading={sceneGraphLoading}
            error={sceneGraphError}
            selectedNodeId={selectedSceneNode?.id ?? null}
            onSelectNode={setSelectedSceneNode}
          />
        </div>
      </div>
    </LiquidGlassPageShell>
  )
}
