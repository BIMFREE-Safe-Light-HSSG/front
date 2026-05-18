"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, Database, Loader2, Search } from "lucide-react";

import { BuildingSceneCanvas } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import { AssetHoverTooltip } from "@/components/facility-building-viewer/AssetHoverTooltip";
import { ViewerCanvasNavBar } from "@/components/facility-building-viewer/ViewerCanvasNavBar";
import { ViewerSearchPanel } from "@/components/facility-building-viewer/ViewerSearchPanel";
import {
  DEFAULT_LAYER_VISIBILITY,
  type CameraCommand,
  type CameraCommandAction,
  type ViewerLayerVisibility,
} from "@/components/facility-building-viewer/scene-camera-types";
import {
  ViewerCanvasBadge,
  ViewerIconFab,
  viewerGlass,
  viewerType,
} from "@/components/facility-building-viewer/viewer-design";
import type { SceneGraph } from "@/app/api/viewer";
import { collectAssets, uniqueAssetClasses } from "@/lib/scene-graph-skeleton/assets";
import {
  DEFAULT_VIEWER_SEARCH_FILTERS,
  hasActiveViewerSearch,
  highlightSetsFromResults,
  runViewerSearch,
  type ViewerSearchFilters,
  type ViewerSearchResult,
} from "@/lib/scene-graph-skeleton/search";
import type {
  AssetStatus,
  SceneGraphSkeleton,
  SkeletonAsset,
  Vec2,
  Vec3,
  ZoneNode,
} from "@/lib/scene-graph-skeleton/types";
import { cn } from "@/lib/utils";

type SceneGraphStatus = "idle" | "loading" | "ready" | "empty" | "forbidden" | "error";

type EmbeddedBuildingSceneViewerProps = {
  sceneGraph: SceneGraph | null;
  status: SceneGraphStatus;
  buildingName: string | null | undefined;
  districtName: string | null | undefined;
  isEmergency?: boolean;
};

const assetStatuses: AssetStatus[] = ["normal", "inspection_due", "fault", "offline"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVec2(value: unknown): value is Vec2 {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.slice(0, 2).every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function isVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.slice(0, 3).every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function normalizeAsset(raw: unknown): SkeletonAsset | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || !isVec3(raw.position)) {
    return null;
  }

  const rawClass =
    typeof raw.class === "string"
      ? raw.class
      : typeof raw.category === "string"
        ? raw.category
        : typeof raw.name === "string"
          ? raw.name
          : typeof raw.type === "string"
            ? raw.type
            : "Asset";
  const status = typeof raw.status === "string" && assetStatuses.includes(raw.status as AssetStatus)
    ? (raw.status as AssetStatus)
    : undefined;

  return {
    id: raw.id,
    class: rawClass,
    position: [raw.position[0], raw.position[1], raw.position[2]],
    ...(status ? { status } : {}),
  };
}

function normalizeZone(raw: unknown): ZoneNode | null {
  if (!isRecord(raw) || raw.type !== "ZONE" || typeof raw.id !== "string") {
    return null;
  }

  const geometry = raw.geometry;

  if (!isRecord(geometry) || geometry.type !== "Polygon") {
    return null;
  }

  if (
    !isVec3(geometry.center) ||
    typeof geometry.height !== "number" ||
    !Number.isFinite(geometry.height) ||
    !Array.isArray(geometry.coordinates)
  ) {
    return null;
  }

  const coordinates = geometry.coordinates.filter(isVec2).map((point) => [point[0], point[1]] as Vec2);

  if (coordinates.length < 3) {
    return null;
  }

  const assets = Array.isArray(raw.assets)
    ? raw.assets.map(normalizeAsset).filter((asset): asset is SkeletonAsset => Boolean(asset))
    : undefined;

  return {
    id: raw.id,
    type: "ZONE",
    name: typeof raw.name === "string" ? raw.name : raw.id,
    geometry: {
      type: "Polygon",
      center: [geometry.center[0], geometry.center[1], geometry.center[2]],
      height: geometry.height,
      coordinates,
    },
    ...(assets && assets.length > 0 ? { assets } : {}),
  };
}

function toSkeletonDocument(sceneGraph: SceneGraph): SceneGraphSkeleton {
  const raw = sceneGraph.scene_graph;
  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes.map(normalizeZone).filter((node): node is ZoneNode => Boolean(node))
    : [];
  const assets = Array.isArray(raw.assets)
    ? raw.assets.map(normalizeAsset).filter((asset): asset is SkeletonAsset => Boolean(asset))
    : undefined;

  return {
    building_id: sceneGraph.building_name || sceneGraph.building_id,
    scene_graph: {
      nodes,
      edges: Array.isArray(raw.edges) ? raw.edges : [],
      ...(assets && assets.length > 0 ? { assets } : {}),
    },
  };
}

function ViewerMessage({
  status,
  nodeCount,
  edgeCount,
}: {
  status: SceneGraphStatus;
  nodeCount: number;
  edgeCount: number;
}) {
  if (status === "loading") {
    return (
      <div className="flex h-full min-h-[520px] items-center justify-center gap-3 font-mono text-xs tracking-[0.3em] text-red-900/50">
        <Loader2 className="h-5 w-5 animate-spin" />
        LOADING GRAPH
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="flex h-full min-h-[520px] items-center justify-center">
        <div className="w-72 rounded-2xl border border-red-900/10 bg-white/35 p-6 text-center backdrop-blur-md">
          <Database className="mx-auto mb-4 h-8 w-8 text-red-900/40" />
          <p className="font-mono text-[10px] tracking-[0.4em] text-red-900/40">SCENE GRAPH</p>
          <p className="mt-3 text-3xl font-black text-zinc-900">
            {nodeCount}
            <span className="text-sm text-zinc-400"> / {edgeCount}</span>
          </p>
          <p className="mt-1 font-mono text-[9px] text-zinc-400">NODES / EDGES</p>
          <p className="mt-4 text-xs text-zinc-500">3D로 표시할 ZONE geometry가 없습니다.</p>
        </div>
      </div>
    );
  }

  const message =
    status === "forbidden"
      ? "해당 건물 접근 권한이 없습니다."
      : status === "error"
        ? "Scene graph를 불러오지 못했습니다."
        : "이 건물에는 아직 scene graph가 없습니다.";

  return (
    <div className="flex h-full min-h-[520px] items-center justify-center">
      <div className="w-72 rounded-2xl border border-red-900/10 bg-white/35 p-6 text-center backdrop-blur-md">
        <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-900/40" />
        <p className="text-sm font-bold text-zinc-700">{message}</p>
      </div>
    </div>
  );
}

export function EmbeddedBuildingSceneViewer({
  sceneGraph,
  status,
  buildingName,
  districtName,
  isEmergency = false,
}: EmbeddedBuildingSceneViewerProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<ViewerSearchFilters>(DEFAULT_VIEWER_SEARCH_FILTERS);
  const [layerVisibility, setLayerVisibility] = useState<ViewerLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const cameraSeqRef = useRef(0);

  const doc = useMemo(() => (sceneGraph ? toSkeletonDocument(sceneGraph) : null), [sceneGraph]);
  const zones = doc?.scene_graph.nodes ?? [];
  const assets = useMemo(() => (doc ? collectAssets(doc) : []), [doc]);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const hoveredAsset = assets.find((asset) => asset.id === hoveredAssetId) ?? null;
  const assetClassOptions = useMemo(() => uniqueAssetClasses(assets), [assets]);
  const searchResults = useMemo(
    () => runViewerSearch(zones, assets, searchFilters),
    [zones, assets, searchFilters],
  );
  const searchFiltersActive = hasActiveViewerSearch(searchFilters);
  const { zoneIds: highlightZoneIds, assetIds: highlightAssetIds } = useMemo(
    () => highlightSetsFromResults(searchFiltersActive ? searchResults : []),
    [searchFiltersActive, searchResults],
  );
  const rawNodeCount = sceneGraph?.scene_graph.nodes?.length ?? 0;
  const rawEdgeCount = sceneGraph?.scene_graph.edges?.length ?? 0;
  const hasSelection = Boolean(selectedAssetId || selectedZoneId);

  const updateHoverAnchor = useCallback((clientX: number, clientY: number) => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setHoverAnchor({ x: clientX - rect.left, y: clientY - rect.top });
  }, []);

  const pushCamera = useCallback((action: CameraCommandAction) => {
    cameraSeqRef.current += 1;
    setCameraCommand({ seq: cameraSeqRef.current, action });
  }, []);

  const handleSelectAsset = useCallback(
    (id: string) => {
      setSelectedAssetId(id);
      const asset = assets.find((item) => item.id === id);
      if (asset?.zoneId) setSelectedZoneId(asset.zoneId);
    },
    [assets],
  );

  const handleSelectSearchResult = useCallback(
    (result: ViewerSearchResult) => {
      if (result.kind === "zone") {
        setSelectedZoneId(result.id);
        setSelectedAssetId(null);
      } else {
        handleSelectAsset(result.id);
      }
    },
    [handleSelectAsset],
  );

  if (!sceneGraph || status !== "ready" || zones.length === 0) {
    return <ViewerMessage status={status} nodeCount={rawNodeCount} edgeCount={rawEdgeCount} />;
  }

  return (
    <div
      ref={canvasWrapRef}
      className={cn(
        viewerGlass.canvas,
        "h-full min-h-[520px] overflow-hidden rounded-[2rem] border-0 bg-zinc-950",
        isEmergency && "ring-2 ring-red-500/30",
      )}
      onPointerMove={(event) => {
        if (hoveredAssetId) updateHoverAnchor(event.clientX, event.clientY);
      }}
      onPointerLeave={() => {
        setHoverAnchor(null);
        setHoveredAssetId(null);
      }}
    >
      <div className={viewerGlass.canvasVignette} aria-hidden />

      <div className="absolute left-5 top-5 z-20 max-w-[calc(100%-9rem)]">
        <p className={cn(viewerType.eyebrow, "text-white/45")}>
          {districtName ?? "No district"} / {sceneGraph.graph_data_id.slice(0, 8)}
        </p>
        <h2 className="mt-1 truncate text-lg font-black uppercase tracking-tight text-white">
          {buildingName ?? sceneGraph.building_name ?? "Selected Building"}
        </h2>
      </div>

      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
        <ViewerIconFab
          active={searchOpen || searchFiltersActive}
          label="검색 및 필터"
          icon={Search}
          onClick={() => setSearchOpen((value) => !value)}
        />
      </div>

      <ViewerCanvasNavBar
        layerVisibility={layerVisibility}
        hasSelection={hasSelection}
        onResetView={() => pushCamera({ type: "preset", preset: "reset" })}
        onTopView={() => pushCamera({ type: "preset", preset: "top" })}
        onIsoView={() => pushCamera({ type: "preset", preset: "iso" })}
        onFocusSelection={() => {
          if (selectedAssetId) {
            pushCamera({ type: "focus-asset", assetId: selectedAssetId, intensity: "medium" });
          } else if (selectedZoneId) {
            pushCamera({ type: "focus-zone", zoneId: selectedZoneId, intensity: "medium" });
          }
        }}
        onToggleZones={() => setLayerVisibility((value) => ({ ...value, zones: !value.zones }))}
        onToggleAssets={() => setLayerVisibility((value) => ({ ...value, assets: !value.assets }))}
      />

      <ViewerSearchPanel
        open={searchOpen}
        filters={searchFilters}
        results={searchResults}
        zones={zones}
        assetClasses={assetClassOptions}
        onClose={() => setSearchOpen(false)}
        onFiltersChange={setSearchFilters}
        onSelectResult={handleSelectSearchResult}
      />

      {searchFiltersActive ? (
        <div className="pointer-events-none absolute left-5 top-20 z-10">
          <ViewerCanvasBadge variant="search">검색 {searchResults.length}건</ViewerCanvasBadge>
        </div>
      ) : null}

      <BuildingSceneCanvas
        zones={zones}
        assets={assets}
        selectedZoneId={selectedZoneId}
        selectedAssetId={selectedAssetId}
        hoveredAssetId={hoveredAssetId}
        placementMode={false}
        draftPosition={null}
        draftClass="Asset"
        layerVisibility={layerVisibility}
        cameraCommand={cameraCommand}
        searchHighlightActive={searchFiltersActive}
        highlightZoneIds={highlightZoneIds}
        highlightAssetIds={highlightAssetIds}
        onSelectZone={(id) => {
          setSelectedZoneId(id);
          if (id !== null) setSelectedAssetId(null);
        }}
        onSelectAsset={handleSelectAsset}
        onHoverAsset={(id) => {
          setHoveredAssetId(id);
          if (!id) setHoverAnchor(null);
        }}
        onClearSelection={() => {
          setSelectedZoneId(null);
          setSelectedAssetId(null);
          setHoveredAssetId(null);
          setHoverAnchor(null);
        }}
        onPlacementPick={() => {}}
      />

      <AssetHoverTooltip asset={hoveredAsset && !selectedAsset ? hoveredAsset : null} anchor={hoverAnchor} />
    </div>
  );
}
