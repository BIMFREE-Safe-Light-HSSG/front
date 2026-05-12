"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import DeckGL from "@deck.gl/react"
import {
  AmbientLight,
  COORDINATE_SYSTEM,
  DirectionalLight,
  LightingEffect,
  OrbitView,
  type OrbitViewState,
} from "@deck.gl/core"
import { PointCloudLayer } from "@deck.gl/layers"

import { filterInterleavedByMaxZ } from "@/lib/facility-point-cloud/filter-interleaved-z"
import {
  getFacilityPointCloudAxisBounds,
  orbitViewStateFromPointCloud,
  planOrbitViewStateFromPointCloud,
} from "@/lib/facility-point-cloud/orbit-view-fit"
import {
  filterInterleavedBySemanticSet,
  histogramSemanticIds,
  parseSemanticIdList,
} from "@/lib/facility-point-cloud/semantic-filter"
import type { FacilityPointCloud } from "@/lib/facility-point-cloud/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

/** Interleaved layout: 7 floats/point, stride 28 bytes; position @0, color @3, semantic @6 (float slot indices). */
const INTERLEAVED_STRIDE_BYTES = 7 * Float32Array.BYTES_PER_ELEMENT
const INTERLEAVED_POSITION_OFFSET_BYTES = 0
const INTERLEAVED_COLOR_OFFSET_BYTES = 3 * Float32Array.BYTES_PER_ELEMENT

const lighting = new LightingEffect({
  ambient: new AmbientLight({ color: [255, 255, 255], intensity: 1.2 }),
  sun: new DirectionalLight({
    color: [255, 255, 255],
    intensity: 0.6,
    direction: [-1, -2, -1],
  }),
})

export type FacilityPointCloudDeckProps = {
  cloud: FacilityPointCloud | null
  pointSize?: number
  className?: string
}

function withOrbitConstraints(vs: OrbitViewState, planLikeDrawing: boolean): OrbitViewState {
  return {
    ...vs,
    minRotationX: planLikeDrawing ? 90 : -90,
    maxRotationX: 90,
  }
}

export function FacilityPointCloudDeck({
  cloud,
  pointSize = 2,
  className,
}: FacilityPointCloudDeckProps) {
  const [planLikeDrawing, setPlanLikeDrawing] = useState(false)
  const [planZCutMax, setPlanZCutMax] = useState(0)
  const [semanticDraft, setSemanticDraft] = useState("")
  const [semanticAllowed, setSemanticAllowed] = useState<Set<number> | null>(null)
  const [viewState, setViewState] = useState<OrbitViewState>(() => ({
    target: [0, 0, 0],
    zoom: 1,
    rotationOrbit: 0,
    rotationX: 20,
    minRotationX: -90,
    maxRotationX: 90,
  }))

  const bounds = useMemo(() => {
    if (!cloud || cloud.pointCount === 0) {
      return null
    }
    return getFacilityPointCloudAxisBounds(cloud)
  }, [cloud])

  useEffect(() => {
    if (!bounds) {
      return
    }
    const dz = bounds.maxZ - bounds.minZ
    setPlanZCutMax(bounds.minZ + dz * 0.4)
  }, [bounds])

  useEffect(() => {
    setSemanticDraft("")
    setSemanticAllowed(null)
  }, [cloud])

  useEffect(() => {
    if (!cloud || cloud.pointCount === 0) {
      return
    }
    const el = typeof window !== "undefined" ? window : null
    const h = el?.innerHeight ?? 800
    setViewState(
      withOrbitConstraints(
        planLikeDrawing ? planOrbitViewStateFromPointCloud(cloud, h) : orbitViewStateFromPointCloud(cloud, h),
        planLikeDrawing,
      ),
    )
  }, [cloud, planLikeDrawing])

  const onViewStateChange = useCallback(
    ({ viewState: vs }: { viewState: OrbitViewState }) => {
      setViewState(withOrbitConstraints(vs, planLikeDrawing))
    },
    [planLikeDrawing],
  )

  const effectivePointSize = planLikeDrawing ? Math.max(1, pointSize * 0.65) : pointSize

  const semanticHistogram = useMemo(() => {
    if (!cloud || cloud.pointCount === 0) {
      return []
    }
    const m = histogramSemanticIds(cloud.semanticIds)
    return [...m.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => a.id - b.id)
  }, [cloud])

  const afterSemantic = useMemo(() => {
    if (!cloud || cloud.pointCount === 0) {
      return null
    }
    if (!semanticAllowed) {
      return { interleaved: cloud.interleaved, pointCount: cloud.pointCount }
    }
    return filterInterleavedBySemanticSet(cloud.interleaved, cloud.pointCount, semanticAllowed)
  }, [cloud, semanticAllowed])

  const afterPlanZ = useMemo(() => {
    if (!afterSemantic) {
      return null
    }
    if (!planLikeDrawing) {
      return null
    }
    return filterInterleavedByMaxZ(afterSemantic.interleaved, afterSemantic.pointCount, planZCutMax)
  }, [afterSemantic, planLikeDrawing, planZCutMax])

  const displayInterleaved =
    planLikeDrawing && afterPlanZ ? afterPlanZ.interleaved : afterSemantic?.interleaved
  const displayCount =
    planLikeDrawing && afterPlanZ ? afterPlanZ.pointCount : (afterSemantic?.pointCount ?? 0)

  const applySemanticFilter = useCallback(() => {
    setSemanticAllowed(parseSemanticIdList(semanticDraft))
  }, [semanticDraft])

  const layers = useMemo(() => {
    if (!cloud || cloud.pointCount === 0 || !displayInterleaved) {
      return []
    }
    if (displayCount === 0) {
      return []
    }
    return [
      new PointCloudLayer({
        id: "facility-point-cloud",
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        colorFormat: "RGB",
        data: {
          length: displayCount,
          attributes: {
            getPosition: {
              value: displayInterleaved,
              size: 3,
              stride: INTERLEAVED_STRIDE_BYTES,
              offset: INTERLEAVED_POSITION_OFFSET_BYTES,
              type: "float32",
            },
            getColor: {
              value: displayInterleaved,
              size: 3,
              stride: INTERLEAVED_STRIDE_BYTES,
              offset: INTERLEAVED_COLOR_OFFSET_BYTES,
              type: "float32",
            },
          },
        },
        getNormal: [0, 0, 1],
        pointSize: effectivePointSize,
        sizeUnits: "pixels",
      }),
    ]
  }, [cloud, displayCount, displayInterleaved, effectivePointSize])

  return (
    <div
      className={cn(
        "relative h-[70vh] w-full min-h-[400px] rounded-lg border border-border",
        className,
      )}
    >
      <div className="bg-background/90 absolute left-2 top-2 z-10 w-64 space-y-2 rounded-md border border-border p-3 shadow-sm backdrop-blur-sm">
        <div className="space-y-1">
          <Label htmlFor="semantic-filter" className="text-xs">
            semantic_id 검색
          </Label>
          <p className="text-muted-foreground text-[11px] leading-snug">
            쉼표·공백으로 여러 개. 적용 시 해당 클래스만 표시합니다. 비우고 적용하면 전체.
          </p>
        </div>
        <div className="flex gap-1">
          <Input
            id="semantic-filter"
            className="h-8 text-xs"
            placeholder="예: 0, 1, 4"
            value={semanticDraft}
            disabled={!cloud || cloud.pointCount === 0}
            onChange={(e) => setSemanticDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                applySemanticFilter()
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            disabled={!cloud || cloud.pointCount === 0}
            onClick={applySemanticFilter}
          >
            적용
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!cloud || cloud.pointCount === 0}
            onClick={() => {
              setSemanticDraft("")
              setSemanticAllowed(null)
            }}
          >
            전체 보기
          </Button>
        </div>
        {semanticAllowed && semanticAllowed.size > 0 ? (
          <p className="text-muted-foreground font-mono text-[11px]">
            필터 ID: {[...semanticAllowed].sort((a, b) => a - b).join(", ")}
          </p>
        ) : null}
        {cloud && cloud.pointCount > 0 ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px]">데이터에 있는 ID (클릭 → 해당만)</p>
            <ScrollArea className="h-32 rounded border border-border/60">
              <ul className="space-y-0.5 p-1">
                {semanticHistogram.map(({ id, count }) => (
                  <li key={id}>
                    <button
                      type="button"
                      className="hover:bg-muted/80 flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs"
                      onClick={() => {
                        setSemanticDraft(String(id))
                        setSemanticAllowed(new Set([id]))
                      }}
                    >
                      <span className="font-mono">id {id}</span>
                      <span className="text-muted-foreground">{count.toLocaleString()}점</span>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        ) : null}
        {cloud && cloud.pointCount > 0 ? (
          <p className="text-muted-foreground border-border border-t pt-2 text-[11px]">
            화면 {displayCount.toLocaleString()} / 전체 {cloud.pointCount.toLocaleString()}점
          </p>
        ) : null}
      </div>
      <div className="bg-background/90 absolute right-2 top-2 z-10 flex gap-1 rounded-md border border-border p-1 shadow-sm backdrop-blur-sm">
        <Button
          type="button"
          size="sm"
          variant={planLikeDrawing ? "outline" : "secondary"}
          disabled={!cloud || cloud.pointCount === 0}
          onClick={() => setPlanLikeDrawing(false)}
        >
          3D
        </Button>
        <Button
          type="button"
          size="sm"
          variant={planLikeDrawing ? "secondary" : "outline"}
          disabled={!cloud || cloud.pointCount === 0}
          onClick={() => setPlanLikeDrawing(true)}
        >
          평면도
        </Button>
      </div>
      {planLikeDrawing && bounds ? (
        <div className="bg-background/90 absolute right-2 top-14 z-10 w-56 space-y-2 rounded-md border border-border p-3 shadow-sm backdrop-blur-sm">
          <div className="space-y-1">
            <Label className="text-xs leading-tight">
              천장 제거 (Z ≤ 이 값만 표시)
            </Label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              위에서 볼 때 위쪽 포인트를 잘라 바닥·벽 쪽만 남깁니다.
            </p>
          </div>
          {bounds.maxZ - bounds.minZ > 1e-9 ? (
            <Slider
              min={bounds.minZ}
              max={bounds.maxZ}
              step={Math.max(1e-6, (bounds.maxZ - bounds.minZ) / 256)}
              value={[planZCutMax]}
              onValueChange={(v) => setPlanZCutMax(v[0] ?? bounds.minZ)}
            />
          ) : (
            <p className="text-muted-foreground text-xs">높이 범위가 없어 자를 수 없습니다.</p>
          )}
          <p className="text-muted-foreground font-mono text-[11px]">
            상한 Z = {planZCutMax.toFixed(3)}
            {cloud ? (
              <span className="text-foreground ml-2">
                · {displayCount.toLocaleString()} / {cloud.pointCount.toLocaleString()}점
              </span>
            ) : null}
          </p>
        </div>
      ) : null}
      <DeckGL
        width="100%"
        height="100%"
        views={new OrbitView({ id: "orbit", orbitAxis: "Z" })}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={true}
        layers={layers}
        effects={[lighting]}
      />
    </div>
  )
}
