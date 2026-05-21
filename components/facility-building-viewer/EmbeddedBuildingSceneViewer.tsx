"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ClipboardList, Database, Flame, Loader2, Search } from "lucide-react";

import { AssetDetailPanel } from "@/components/facility-building-viewer/AssetDetailPanel";
import { BuildingSceneCanvas } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import { AssetHoverTooltip } from "@/components/facility-building-viewer/AssetHoverTooltip";
import { ViewerCanvasNavBar } from "@/components/facility-building-viewer/ViewerCanvasNavBar";
import { ViewerFireIncidentsPanel } from "@/components/facility-building-viewer/ViewerFireIncidentsPanel";
import { ViewerInspectionHistoryPanel } from "@/components/facility-building-viewer/ViewerInspectionHistoryPanel";
import { ViewerSearchPanel } from "@/components/facility-building-viewer/ViewerSearchPanel";
import {
  DEFAULT_LAYER_VISIBILITY,
  STRUCTURAL_LAYER_VISIBILITY,
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
import { getStoredAuthUser } from "@/lib/auth/storage";
import type { FireIncident } from "@/lib/fire-incidents/types";
import { parseFireIncidentsFromSceneGraph } from "@/lib/fire-incidents/storage";
import {
  fetchBuildingFireIncidents,
  registerBuildingFireIncident,
  removeBuildingFireIncident,
} from "@/lib/fire-incidents/repository";
import { FIRE_INCIDENTS_CHANGED_EVENT } from "@/lib/fire-incidents/storage";
import type { FireSeverity } from "@/lib/fire-incidents/types";
import { FireIncidentRegisterDialog } from "@/components/facility-building-viewer/FireIncidentRegisterDialog";
import { collectAssets, findZoneForAssetPosition, uniqueAssetClasses } from "@/lib/scene-graph-skeleton/assets";
import { parseInspectionHistory } from "@/lib/scene-graph-skeleton/inspection-history";
import { filterAssetsForViewerMode } from "@/lib/scene-graph-skeleton/structural-assets";
import {
  DEFAULT_VIEWER_SEARCH_FILTERS,
  filterAssetsForViewerDisplay,
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
  buildingId?: string | null;
  buildingName: string | null | undefined;
  districtName: string | null | undefined;
  /** false — 3D·검색만 (소방 등), 점검 이력·관리 기록 비활성 */
  enableFacilityTools?: boolean;
  isEmergency?: boolean;
  /** 화재 등록·삭제 시 건물 목록 재정렬용 */
  onFireIncidentsChange?: () => void;
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

  const inspection_history = parseInspectionHistory(raw.inspection_history);

  return {
    id: raw.id,
    class: rawClass,
    position: [raw.position[0], raw.position[1], raw.position[2]],
    ...(status ? { status } : {}),
    ...(inspection_history ? { inspection_history } : {}),
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
  const inspection_history = parseInspectionHistory(raw.inspection_history);
  const fire_incidents = parseFireIncidentsFromSceneGraph(
    (raw as { fire_incidents?: unknown }).fire_incidents,
  );

  return {
    building_id: sceneGraph.building_name || sceneGraph.building_id,
    scene_graph: {
      nodes,
      edges: Array.isArray(raw.edges) ? raw.edges : [],
      ...(assets && assets.length > 0 ? { assets } : {}),
      ...(inspection_history ? { inspection_history } : {}),
      ...(fire_incidents.length > 0 ? { fire_incidents } : {}),
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
  buildingId,
  buildingName,
  districtName,
  enableFacilityTools = true,
  isEmergency = false,
  onFireIncidentsChange,
}: EmbeddedBuildingSceneViewerProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedFireId, setSelectedFireId] = useState<string | null>(null);
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [firePanelOpen, setFirePanelOpen] = useState(false);
  const [fireIncidents, setFireIncidents] = useState<FireIncident[]>([]);
  const [draftFirePosition, setDraftFirePosition] = useState<Vec3 | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<{
    position: Vec3;
    zoneId?: string;
    zoneName?: string;
  } | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [fireSubmitting, setFireSubmitting] = useState(false);

  const canManageFires = enableFacilityTools && Boolean(buildingId);
  const showFireLayer = Boolean(buildingId);
  /** 시설 페이지 「Activate Response」와 연동 */
  const responseActive = canManageFires && isEmergency;
  const firePlacementActive = responseActive;
  const firePanelVisible = responseActive || (showFireLayer && !canManageFires && firePanelOpen);
  const [searchFilters, setSearchFilters] = useState<ViewerSearchFilters>(DEFAULT_VIEWER_SEARCH_FILTERS);
  const [layerVisibility, setLayerVisibility] = useState<ViewerLayerVisibility>(
    enableFacilityTools ? DEFAULT_LAYER_VISIBILITY : STRUCTURAL_LAYER_VISIBILITY,
  );
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const cameraSeqRef = useRef(0);

  const doc = useMemo(() => (sceneGraph ? toSkeletonDocument(sceneGraph) : null), [sceneGraph]);
  const zones = doc?.scene_graph.nodes ?? [];
  const buildingInspectionHistory = doc?.scene_graph.inspection_history;
  const assets = useMemo(() => (doc ? collectAssets(doc) : []), [doc]);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const hoveredAsset = assets.find((asset) => asset.id === hoveredAssetId) ?? null;
  const assetClassOptions = useMemo(() => uniqueAssetClasses(assets), [assets]);
  const searchResults = useMemo(() => {
    const results = runViewerSearch(zones, assets, searchFilters);
    return enableFacilityTools ? results : results.filter((result) => result.kind === "zone");
  }, [zones, assets, searchFilters, enableFacilityTools]);
  const searchFiltersActive = hasActiveViewerSearch(searchFilters);
  const { zoneIds: highlightZoneIds, assetIds: highlightAssetIds } = useMemo(() => {
    const sets = highlightSetsFromResults(searchFiltersActive ? searchResults : []);
    return enableFacilityTools
      ? sets
      : { zoneIds: sets.zoneIds, assetIds: new Set<string>() };
  }, [searchFiltersActive, searchResults, enableFacilityTools]);

  const canvasLayerVisibility = useMemo(
    () =>
      enableFacilityTools
        ? layerVisibility
        : { zones: layerVisibility.zones, assets: true, fires: layerVisibility.fires },
    [enableFacilityTools, layerVisibility],
  );

  const reloadFireIncidents = useCallback(async () => {
    if (!showFireLayer || !buildingId || !doc) {
      setFireIncidents([]);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const user = getStoredAuthUser();
    const incidents = await fetchBuildingFireIncidents(buildingId, {
      accessToken: token,
      job: user?.job ?? null,
      sceneGraphSeed: doc.scene_graph.fire_incidents,
    });
    setFireIncidents(incidents);
    setSelectedFireId(null);
    setDraftFirePosition(null);
  }, [buildingId, doc, showFireLayer]);

  useEffect(() => {
    void reloadFireIncidents();
  }, [reloadFireIncidents]);

  useEffect(() => {
    if (!buildingId) return;

    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ buildingId?: string }>).detail;
      if (!detail?.buildingId || detail.buildingId === buildingId) {
        void reloadFireIncidents();
      }
    };

    window.addEventListener(FIRE_INCIDENTS_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(FIRE_INCIDENTS_CHANGED_EVENT, handleChanged);
  }, [buildingId, reloadFireIncidents]);

  useEffect(() => {
    if (!responseActive) return;
    setLayerVisibility((value) => ({ ...value, fires: true }));
    setSearchOpen(false);
    setSidePanelOpen(false);
    setSelectedAssetId(null);
  }, [responseActive]);

  const canvasAssets = useMemo(() => {
    const modeFiltered = filterAssetsForViewerMode(assets, enableFacilityTools);
    if (!enableFacilityTools) {
      return modeFiltered;
    }
    return filterAssetsForViewerDisplay(modeFiltered, searchFilters);
  }, [assets, enableFacilityTools, searchFilters]);

  useEffect(() => {
    if (!enableFacilityTools || !selectedAssetId) return;
    if (!canvasAssets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(null);
    }
  }, [canvasAssets, selectedAssetId, enableFacilityTools]);

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
        setSelectedFireId(null);
      } else {
        handleSelectAsset(result.id);
        setSelectedFireId(null);
      }
    },
    [handleSelectAsset],
  );

  const handleFirePlacementPick = useCallback(
    (position: Vec3) => {
      if (!canManageFires || !buildingId) return;

      const zone = findZoneForAssetPosition(zones, position);
      setPendingPlacement({
        position,
        zoneId: zone?.zoneId,
        zoneName: zone?.zoneName,
      });
      setDraftFirePosition(position);
      setRegisterDialogOpen(true);
      setSelectedAssetId(null);
      setSelectedZoneId(zone?.zoneId ?? null);
    },
    [canManageFires, buildingId, zones],
  );

  const handleConfirmFireRegister = useCallback(
    async ({ severity, note }: { severity: FireSeverity; note: string }) => {
      if (!pendingPlacement || !buildingId) return;

      const token = localStorage.getItem("accessToken");
      const user = getStoredAuthUser();

      setFireSubmitting(true);
      try {
        const created = await registerBuildingFireIncident(buildingId, {
          accessToken: token,
          position: pendingPlacement.position,
          severity,
          note: note || undefined,
          zoneId: pendingPlacement.zoneId,
          zoneName: pendingPlacement.zoneName,
          reportedBy: user?.email,
        });
        setFireIncidents((current) => [...current, created]);
        setSelectedFireId(created.id);
        onFireIncidentsChange?.();
      } catch {
        alert("화재 위치를 등록하지 못했습니다. 로그인 상태와 네트워크를 확인해 주세요.");
      } finally {
        setFireSubmitting(false);
        setRegisterDialogOpen(false);
        setPendingPlacement(null);
        setDraftFirePosition(null);
      }
    },
    [pendingPlacement, buildingId, onFireIncidentsChange],
  );

  const handleCancelFireRegister = useCallback(() => {
    setRegisterDialogOpen(false);
    setPendingPlacement(null);
    setDraftFirePosition(null);
  }, []);

  const handleRemoveFire = useCallback(
    async (id: string) => {
      if (!buildingId) return;
      if (!confirm("이 화재 위치를 삭제할까요?")) return;

      const token = localStorage.getItem("accessToken");
      try {
        await removeBuildingFireIncident(buildingId, id, { accessToken: token });
        setFireIncidents((current) => current.filter((item) => item.id !== id));
        setSelectedFireId((current) => (current === id ? null : current));
        onFireIncidentsChange?.();
      } catch {
        alert("화재 위치를 삭제하지 못했습니다.");
      }
    },
    [buildingId, onFireIncidentsChange],
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

      <div
        className={cn(
          "absolute left-5 top-5 z-20",
          enableFacilityTools ? "max-w-[calc(100%-8rem)]" : "max-w-[calc(100%-2rem)]",
        )}
      >
        <p className={cn(viewerType.eyebrow, "text-white/45")}>
          {districtName ?? "No district"} / {sceneGraph.graph_data_id.slice(0, 8)}
        </p>
        <h2 className="mt-1 truncate text-lg font-black uppercase tracking-tight text-white">
          {buildingName ?? sceneGraph.building_name ?? "Selected Building"}
        </h2>
      </div>

      {enableFacilityTools || (showFireLayer && !canManageFires) ? (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          {showFireLayer && !canManageFires ? (
            <ViewerIconFab
              active={firePanelOpen}
              label="화재 위치 보기"
              icon={Flame}
              onClick={() => setFirePanelOpen((value) => !value)}
            />
          ) : null}
          {enableFacilityTools ? (
            <>
              <ViewerIconFab
                active={sidePanelOpen}
                label="점검 이력"
                icon={ClipboardList}
                onClick={() => {
                  setSidePanelOpen((value) => {
                    const next = !value;
                    if (next) setSearchOpen(false);
                    return next;
                  });
                }}
              />
              <ViewerIconFab
                active={searchOpen || searchFiltersActive}
                label="검색 및 필터"
                icon={Search}
                onClick={() => {
                  setSearchOpen((value) => {
                    const next = !value;
                    if (next) setSidePanelOpen(false);
                    return next;
                  });
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {enableFacilityTools ? (
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
          onToggleFires={
            showFireLayer
              ? () => setLayerVisibility((value) => ({ ...value, fires: !value.fires }))
              : undefined
          }
        />
      ) : showFireLayer ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
          <button
            type="button"
            onClick={() => setLayerVisibility((value) => ({ ...value, fires: !value.fires }))}
            className={cn(
              viewerGlass.overlayLight,
              "rounded-full px-4 py-2 text-[10px] font-semibold tracking-wide text-red-900 shadow-lg",
            )}
          >
            화재 표시 {layerVisibility.fires ? "ON" : "OFF"}
          </button>
        </div>
      ) : null}

      {enableFacilityTools ? (
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
      ) : null}

      {enableFacilityTools ? (
        <ViewerInspectionHistoryPanel
          open={sidePanelOpen}
          buildingName={buildingName ?? sceneGraph.building_name}
          assets={assets}
          buildingInspectionHistory={buildingInspectionHistory}
          onClose={() => setSidePanelOpen(false)}
          onSelectAsset={handleSelectAsset}
        />
      ) : null}

      <AnimatePresence>
        {enableFacilityTools && selectedAsset ? (
          <motion.aside
            key={selectedAsset.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              viewerGlass.overlayLight,
              "pointer-events-auto absolute bottom-16 left-3 z-20 flex max-h-[min(52%,420px)] w-[min(100%,320px)] flex-col overflow-hidden rounded-2xl shadow-xl",
            )}
          >
            <AssetDetailPanel
              asset={selectedAsset}
              onClose={() => {
                setSelectedAssetId(null);
              }}
              className="overflow-y-auto"
            />
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {enableFacilityTools && searchFiltersActive ? (
        <div className="pointer-events-none absolute left-5 top-20 z-10">
          <ViewerCanvasBadge variant="search">검색 {searchResults.length}건</ViewerCanvasBadge>
        </div>
      ) : null}

      {firePlacementActive ? (
        <div className="pointer-events-none absolute left-5 top-20 z-10">
          <ViewerCanvasBadge variant="fire">화재 위치 지정 모드</ViewerCanvasBadge>
        </div>
      ) : null}

      {firePanelVisible ? (
        <ViewerFireIncidentsPanel
          open
          readOnly={!canManageFires}
          responseActive={responseActive}
          incidents={fireIncidents}
          selectedFireId={selectedFireId}
          placementMode={firePlacementActive}
          onClose={() => {
            if (responseActive) return;
            setFirePanelOpen(false);
            setDraftFirePosition(null);
          }}
          onTogglePlacement={() => {}}
          onSelect={setSelectedFireId}
          onRemove={handleRemoveFire}
        />
      ) : null}

      <BuildingSceneCanvas
        zones={zones}
        assets={canvasAssets}
        selectedZoneId={selectedZoneId}
        selectedAssetId={enableFacilityTools ? selectedAssetId : null}
        hoveredAssetId={hoveredAssetId}
        placementMode={firePlacementActive}
        draftPosition={firePlacementActive ? draftFirePosition : null}
        draftClass="화재"
        placementVariant={firePlacementActive ? "fire" : "default"}
        fireIncidents={showFireLayer ? fireIncidents : []}
        selectedFireId={selectedFireId}
        onSelectFire={setSelectedFireId}
        layerVisibility={canvasLayerVisibility}
        cameraCommand={cameraCommand}
        searchHighlightActive={searchFiltersActive}
        highlightZoneIds={highlightZoneIds}
        highlightAssetIds={highlightAssetIds}
        onSelectZone={(id) => {
          if (firePlacementActive) return;
          setSelectedZoneId(id);
          if (id !== null) {
            setSelectedAssetId(null);
            setSelectedFireId(null);
          }
        }}
        onSelectAsset={enableFacilityTools ? handleSelectAsset : () => {}}
        onHoverAsset={(id) => {
          setHoveredAssetId(id);
          if (!id) setHoverAnchor(null);
        }}
        onClearSelection={() => {
          if (firePlacementActive) return;
          setSelectedZoneId(null);
          setSelectedAssetId(null);
          setSelectedFireId(null);
          setHoveredAssetId(null);
          setHoverAnchor(null);
        }}
        onPlacementPick={(position) => {
          if (firePlacementActive) {
            handleFirePlacementPick(position);
          }
        }}
      />

      <AssetHoverTooltip
        asset={hoveredAsset && !selectedAsset ? hoveredAsset : null}
        anchor={hoverAnchor}
      />

      <FireIncidentRegisterDialog
        open={registerDialogOpen}
        zoneName={pendingPlacement?.zoneName}
        submitting={fireSubmitting}
        onConfirm={handleConfirmFireRegister}
        onCancel={handleCancelFireRegister}
      />
    </div>
  );
}
