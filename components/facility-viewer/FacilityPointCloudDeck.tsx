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
import { PointCloudLayer, PathLayer } from "@deck.gl/layers"
import { SimpleMeshLayer } from "@deck.gl/mesh-layers"

import { filterInterleavedByMaxZ } from "@/lib/facility-point-cloud/filter-interleaved-z"
import {
  getFacilityPointCloudAxisBounds,
  orbitViewStateFromPointCloud,
  planOrbitViewStateFromPointCloud,
} from "@/lib/facility-point-cloud/orbit-view-fit"
import {
  filterInterleavedBySemanticSet,
  filterInterleavedExcludingSemanticSet,
  histogramSemanticIds,
  parseSemanticIdList,
} from "@/lib/facility-point-cloud/semantic-filter"
import { GLASS_STRUCTURE_SEMANTICS, STRUCTURE_GLASS_STYLE } from "@/lib/facility-mesh/semantic-labels"
import type { GlassMeshDocument } from "@/lib/facility-mesh/types"
import {
  bboxEdgePaths,
  colorForClass,
  nodeBounds,
  semanticIdForClass,
} from "@/lib/facility-scene-graph/node-utils"
import { orbitViewStateFromBounds } from "@/lib/facility-scene-graph/orbit-view-from-bounds"
import type { FacilitySceneNode } from "@/lib/facility-scene-graph/types"
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
  glassMesh?: GlassMeshDocument | null
  selectedSceneNode?: FacilitySceneNode | null
  onClearSceneSelection?: () => void
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
  glassMesh,
  selectedSceneNode,
  onClearSceneSelection,
  pointSize = 2,
  className,
}: FacilityPointCloudDeckProps) {
  const [planLikeDrawing, setPlanLikeDrawing] = useState(false)
  const [glassShellEnabled, setGlassShellEnabled] = useState(true)
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
    if (!selectedSceneNode) return
    const sem =
      semanticIdForClass(selectedSceneNode.class) ??
      (selectedSceneNode.source_class ? semanticIdForClass(selectedSceneNode.source_class) : undefined)
    if (sem !== undefined) {
      setSemanticAllowed(new Set([sem]))
      setSemanticDraft(String(sem))
    }
    const nodeB = nodeBounds(selectedSceneNode)
    if (nodeB) {
      const h = typeof window !== "undefined" ? window.innerHeight : 800
      setViewState(
        withOrbitConstraints(orbitViewStateFromBounds(nodeB, h, planLikeDrawing), planLikeDrawing),
      )
    }
  }, [selectedSceneNode, planLikeDrawing])

  useEffect(() => {
    if (!cloud || cloud.pointCount === 0) {
      return
    }
    if (selectedSceneNode) {
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
  }, [cloud, planLikeDrawing, selectedSceneNode])

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

  const structureExcluded = useMemo(() => {
    if (!glassShellEnabled || !glassMesh || glassMesh.meshes.length === 0) {
      return null
    }
    return new Set<number>(GLASS_STRUCTURE_SEMANTICS)
  }, [glassMesh, glassShellEnabled])

  const afterGlassExclude = useMemo(() => {
    if (!afterSemantic) {
      return null
    }
    if (!structureExcluded) {
      return afterSemantic
    }
    return filterInterleavedExcludingSemanticSet(
      afterSemantic.interleaved,
      afterSemantic.pointCount,
      structureExcluded,
    )
  }, [afterSemantic, structureExcluded])

  const afterPlanZ = useMemo(() => {
    if (!afterGlassExclude) {
      return null
    }
    if (!planLikeDrawing) {
      return null
    }
    return filterInterleavedByMaxZ(afterGlassExclude.interleaved, afterGlassExclude.pointCount, planZCutMax)
  }, [afterGlassExclude, planLikeDrawing, planZCutMax])

  const displayInterleaved =
    planLikeDrawing && afterPlanZ ? afterPlanZ.interleaved : afterGlassExclude?.interleaved
  const displayCount =
    planLikeDrawing && afterPlanZ ? afterPlanZ.pointCount : (afterGlassExclude?.pointCount ?? 0)

  const applySemanticFilter = useCallback(() => {
    setSemanticAllowed(parseSemanticIdList(semanticDraft))
  }, [semanticDraft])

  const layers = useMemo(() => {
    const result: (PointCloudLayer | SimpleMeshLayer)[] = []

    if (glassShellEnabled && glassMesh) {
      for (const mesh of glassMesh.meshes) {
        const style = STRUCTURE_GLASS_STYLE[mesh.semanticId]
        const opacity = style?.opacity ?? mesh.opacity
        const color = style?.color ?? mesh.color
        result.push(
          new SimpleMeshLayer({
            id: `glass-${mesh.id}`,
            data: [mesh],
            mesh: {
              positions: new Float32Array(mesh.positions),
              normals: new Float32Array(mesh.normals),
              indices: new Uint32Array(mesh.indices),
            },
            getPosition: [0, 0, 0],
            getColor: [color[0], color[1], color[2], Math.round(opacity * 255)],
            coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
            pickable: false,
            _lighting: "pbr",
            material: {
              ambient: 0.55,
              diffuse: 0.78,
              shininess: 48,
              specularColor: [255, 255, 255],
            },
            parameters: {
              depthTest: true,
              depthMask: false,
              blend: true,
              cullFace: false,
            },
          }),
        )
      }
    }

    if (!cloud || cloud.pointCount === 0 || !displayInterleaved || displayCount === 0) {
      return result
    }

    result.push(
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
    )

    if (selectedSceneNode) {
      const nodeB = nodeBounds(selectedSceneNode)
      if (nodeB) {
        const accent = colorForClass(selectedSceneNode.class)
        result.push(
          new PathLayer({
            id: "scene-graph-selection-bbox",
            coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
            data: bboxEdgePaths(nodeB),
            getPath: (d) => d,
            getColor: accent,
            getWidth: 2,
            widthUnits: "pixels",
            pickable: false,
          }),
        )
      }
    }

    return result
  }, [
    cloud,
    displayCount,
    displayInterleaved,
    effectivePointSize,
    glassMesh,
    glassShellEnabled,
    selectedSceneNode,
  ])

  return (
    <div
      className={cn(
        "relative h-[70vh] w-full min-h-[400px] rounded-lg border border-red-900/10",
        className,
      )}
    >
      <div className="absolute left-2 top-2 z-10 w-64 space-y-2 rounded-2xl border border-red-900/15 bg-white/85 p-3 shadow-sm backdrop-blur-md">
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
              onClearSceneSelection?.()
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
            <ScrollArea className="h-32 rounded-xl border border-red-900/10">
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
        {selectedSceneNode ? (
          <p className="rounded-xl bg-red-50 px-2 py-1.5 text-[11px] leading-snug text-red-950">
            그래프 선택: <span className="font-semibold">{selectedSceneNode.name}</span>
            <span className="text-red-900/70"> · {selectedSceneNode.class}</span>
            {selectedSceneNode.status ? (
              <span className="text-red-900/70"> · {selectedSceneNode.status}</span>
            ) : null}
          </p>
        ) : null}
        {glassMesh && glassMesh.meshes.length > 0 ? (
          <p className="text-muted-foreground rounded-xl border border-red-900/10 bg-red-50/40 px-2 py-1.5 text-[11px] leading-snug">
            천장·바닥·벽 → 글래스 메시 {glassMesh.meshes.length}면
            {glassShellEnabled ? " (대체 표시)" : " (원본 점 표시)"}
          </p>
        ) : null}
        {cloud && cloud.pointCount > 0 ? (
          <p className="text-muted-foreground border-t border-red-900/10 pt-2 text-[11px]">
            화면 {displayCount.toLocaleString()} / 전체 {cloud.pointCount.toLocaleString()}점
          </p>
        ) : null}
      </div>
      <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-2">
        <div className="flex gap-1 rounded-2xl border border-red-900/15 bg-white/85 p-1 shadow-sm backdrop-blur-md">
          <Button
            type="button"
            size="sm"
            variant={glassShellEnabled ? "secondary" : "outline"}
            disabled={!glassMesh || glassMesh.meshes.length === 0}
            onClick={() => setGlassShellEnabled((v) => !v)}
          >
            Glass
          </Button>
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
      </div>
      {planLikeDrawing && bounds ? (
        <div className="absolute right-2 top-14 z-10 w-56 space-y-2 rounded-2xl border border-red-900/15 bg-white/85 p-3 shadow-sm backdrop-blur-md">
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
