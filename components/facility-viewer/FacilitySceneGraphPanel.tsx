"use client"

import { ChevronDown, ChevronRight, Network } from "lucide-react"
import { useMemo, useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  colorForClass,
  groupRootChildren,
} from "@/lib/facility-scene-graph/node-utils"
import type { FacilitySceneGraphDocument, FacilitySceneNode } from "@/lib/facility-scene-graph/types"
import { cn } from "@/lib/utils"

export type FacilitySceneGraphPanelProps = {
  sceneGraph: FacilitySceneGraphDocument | null
  loading?: boolean
  error?: string | null
  selectedNodeId: string | null
  onSelectNode: (node: FacilitySceneNode | null) => void
  className?: string
}

function ClassSwatch({ className }: { className: string }) {
  const color = colorForClass(className)
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-black/10"
      style={{ backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})` }}
    />
  )
}

function NodeRow({
  node,
  selectedNodeId,
  onSelectNode,
  compact,
}: {
  node: FacilitySceneNode
  selectedNodeId: string | null
  onSelectNode: (node: FacilitySceneNode) => void
  compact?: boolean
}) {
  const selected = selectedNodeId === node.id
  return (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
        selected ? "bg-red-100/90 text-red-950" : "hover:bg-muted/70",
        compact && "py-1",
      )}
      onClick={() => onSelectNode(node)}
    >
      <ClassSwatch className={node.class} />
      <span className="truncate font-medium">{node.name}</span>
      {node.point_count !== undefined ? (
        <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
          {node.point_count.toLocaleString()}
        </span>
      ) : null}
    </button>
  )
}

function AssetGroup({
  label,
  nodes,
  selectedNodeId,
  onSelectNode,
}: {
  label: string
  nodes: FacilitySceneNode[]
  selectedNodeId: string | null
  onSelectNode: (node: FacilitySceneNode) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1">
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </CollapsibleTrigger>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex-1 py-1 text-left text-[11px] font-semibold tracking-wide uppercase"
            onClick={() => setOpen((v) => !v)}
          >
            {label}{" "}
            <span className="font-mono font-normal normal-case text-red-900/50">({nodes.length})</span>
          </button>
        </div>
        <CollapsibleContent>
          <ul className="mt-0.5 space-y-0.5 pl-6">
            {nodes.map((node) => (
              <li key={node.id}>
                <NodeRow
                  node={node}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                  compact
                />
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

export function FacilitySceneGraphPanel({
  sceneGraph,
  loading,
  error,
  selectedNodeId,
  onSelectNode,
  className,
}: FacilitySceneGraphPanelProps) {
  const groups = useMemo(
    () => (sceneGraph ? groupRootChildren(sceneGraph.root) : []),
    [sceneGraph],
  )

  const stats = useMemo(() => {
    if (!sceneGraph) return null
    const children = sceneGraph.root.children ?? []
    return {
      nodes: children.length,
      points: children.reduce((s, n) => s + (n.point_count ?? 0), 0),
    }
  }, [sceneGraph])

  return (
    <aside
      className={cn(
        "flex h-full min-h-[65vh] flex-col rounded-[1.5rem] border border-red-900/10 bg-white/50 backdrop-blur-sm",
        className,
      )}
    >
      <div className="border-b border-red-900/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-red-900/60" />
          <h2 className="text-sm font-black tracking-tight text-zinc-900 uppercase">Scene Graph</h2>
        </div>
        {sceneGraph ? (
          <div className="mt-1 space-y-0.5">
            <p className="text-xs font-semibold text-zinc-800">{sceneGraph.root.name}</p>
            <p className="text-muted-foreground text-[11px] leading-snug">
              {sceneGraph.scene_id} · v{sceneGraph.version}
              {stats ? ` · ${stats.nodes} nodes · ${stats.points.toLocaleString()} pts` : ""}
            </p>
          </div>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        {loading ? (
          <p className="text-muted-foreground px-2 font-mono text-[11px] uppercase">Loading graph…</p>
        ) : null}
        {error ? (
          <p className="text-destructive px-2 text-xs" role="alert">
            {error}
          </p>
        ) : null}
        {sceneGraph ? (
          <ul className="space-y-2">
            <li>
              <NodeRow
                node={sceneGraph.root}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
              />
            </li>
            {groups.map((group) =>
              group.key === "assets" && group.nodes.length > 8 ? (
                <AssetGroup
                  key={group.key}
                  label={group.label}
                  nodes={group.nodes}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                />
              ) : (
                <li key={group.key}>
                  <p className="text-muted-foreground px-2 py-1 text-[10px] font-bold tracking-widest uppercase">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.nodes.map((node) => (
                      <li key={node.id}>
                        <NodeRow
                          node={node}
                          selectedNodeId={selectedNodeId}
                          onSelectNode={onSelectNode}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ),
            )}
          </ul>
        ) : !loading && !error ? (
          <p className="text-muted-foreground px-2 text-xs">씬 그래프 데이터가 없습니다.</p>
        ) : null}
      </ScrollArea>

      {selectedNodeId ? (
        <div className="border-t border-red-900/10 px-4 py-3">
          <button
            type="button"
            className="text-xs font-medium text-red-900/70 hover:text-red-950"
            onClick={() => onSelectNode(null)}
          >
            선택 해제
          </button>
        </div>
      ) : null}
    </aside>
  )
}
