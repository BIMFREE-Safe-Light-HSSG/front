"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseFacilityPointCloudNpy } from "@/lib/facility-point-cloud/load-npy"
import type { FacilityPointCloud } from "@/lib/facility-point-cloud/types"

const SAMPLE_URL = "/api/pointcloud-sample"

const FacilityPointCloudDeck = dynamic(
  () =>
    import("@/components/facility-viewer/FacilityPointCloudDeck").then((m) => m.FacilityPointCloudDeck),
  { ssr: false },
)

export default function FacilityViewerPage() {
  const [cloud, setCloud] = useState<FacilityPointCloud | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadBundledSample = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(SAMPLE_URL, { cache: "no-store", signal })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `${res.status} ${res.statusText}`)
    }
    const buf = await res.arrayBuffer()
    return parseFacilityPointCloudNpy(buf, {
      meta: { fileName: "processed_pointcloud.npy", source: "app/api sample" },
    })
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    setBusy(true)
    setError(null)
    loadBundledSample(ac.signal)
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
      .finally(() => {
        if (!ac.signal.aborted) {
          setBusy(false)
        }
      })
    return () => ac.abort()
  }, [loadBundledSample])

  const onFile = useCallback(async (file: File | null) => {
    if (!file) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      setCloud(parseFacilityPointCloudNpy(buf, { meta: { fileName: file.name } }))
    } catch (e) {
      setCloud(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">시설 포인트 클라우드 뷰어</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          페이지 진입 시 <code className="text-xs">app/api/processed_pointcloud.npy</code> 샘플을 불러옵니다. 다른
          파일은 행이 <code className="text-xs">[x, y, z, r, g, b, semantic_id]</code>인{" "}
          <code className="text-xs">.npy</code>로 선택할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid w-full max-w-sm gap-2">
          <Label htmlFor="npy">포인트 데이터 (.npy)</Label>
          <Input
            id="npy"
            type="file"
            accept=".npy"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="button" variant="outline" disabled={busy || !cloud} onClick={() => setCloud(null)}>
          초기화
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setError(null)
            loadBundledSample()
              .then(setCloud)
              .catch((e) => {
                setCloud(null)
                setError(e instanceof Error ? e.message : String(e))
              })
              .finally(() => setBusy(false))
          }}
        >
          샘플 다시 로드
        </Button>
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
