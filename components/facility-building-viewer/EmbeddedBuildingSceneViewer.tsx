"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ClipboardList, Database, Flame, Loader2, Plus, Search, Trash2 } from "lucide-react";

import { AssetDetailPanel } from "@/components/facility-building-viewer/AssetDetailPanel";
import {
  BuildingSceneCanvas,
  type SceneContextTarget,
} from "@/components/facility-building-viewer/BuildingSceneCanvas";
import { ViewerCanvasNavBar } from "@/components/facility-building-viewer/ViewerCanvasNavBar";
import { ViewerMinimap } from "@/components/facility-building-viewer/ViewerMinimap";
import { ViewerFireIncidentsPanel } from "@/components/facility-building-viewer/ViewerFireIncidentsPanel";
import { ViewerInspectionHistoryPanel } from "@/components/facility-building-viewer/ViewerInspectionHistoryPanel";
import { ViewerSearchPanel } from "@/components/facility-building-viewer/ViewerSearchPanel";
import {
  DEFAULT_LAYER_VISIBILITY,
  DEFAULT_SHELL_DISPLAY,
  FIREFIGHTER_LAYER_VISIBILITY,
  type CameraCommand,
  type CameraCommandAction,
  type ViewerLayerVisibility,
  type ViewerShellDisplay,
} from "@/components/facility-building-viewer/scene-camera-types";
import { boundsFromSubset } from "@/lib/scene-graph-skeleton/bounds";
import {
  ViewerCanvasBadge,
  ViewerIconFab,
  viewerGlass,
  viewerType,
} from "@/components/facility-building-viewer/viewer-design";
import {
  applySceneGraphMutations,
  getBuildingSceneGraph,
  vec3ToSceneGraphPosition,
  type SceneGraph,
  type SceneGraphMutation,
} from "@/app/api/viewer";
import { getStoredAuthUser } from "@/lib/auth/storage";
import type { FireIncident } from "@/lib/fire-incidents/types";
import { parseFireIncidentsFromSceneGraph } from "@/lib/fire-incidents/storage";
import { fetchBuildingFireIncidents } from "@/lib/fire-incidents/repository";
import { FIRE_INCIDENTS_CHANGED_EVENT } from "@/lib/fire-incidents/storage";
import type { FireSeverity } from "@/lib/fire-incidents/types";
import { FireIncidentRegisterDialog } from "@/components/facility-building-viewer/FireIncidentRegisterDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  collectAssets,
  findZoneForAssetPosition,
  uniqueAssetClasses,
  zoneIdsContainingFireIncidents,
} from "@/lib/scene-graph-skeleton/assets";
import { parseInspectionHistory } from "@/lib/scene-graph-skeleton/inspection-history";
import { filterAssetsForViewerMode } from "@/lib/scene-graph-skeleton/structural-assets";
import {
  DEFAULT_VIEWER_SEARCH_FILTERS,
  filterAssetsForViewerDisplay,
  shouldSearchZones,
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
import { getAxiosErrorStatus } from "@/lib/http/errors";
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
  onSceneGraphChange?: (sceneGraph: SceneGraph) => void;
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

function normalizePosition(value: unknown): Vec3 | null {
  if (isVec3(value)) {
    return [value[0], value[1], value[2]];
  }

  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y) &&
    typeof value.z === "number" &&
    Number.isFinite(value.z)
  ) {
    return [value.x, value.y, value.z];
  }

  return null;
}

function normalizeAsset(raw: unknown): SkeletonAsset | null {
  if (!isRecord(raw) || typeof raw.id !== "string") {
    return null;
  }

  const position = normalizePosition(raw.position);
  if (!position) return null;

  const rawClass =
    typeof raw.class === "string"
      ? raw.class
      : typeof raw.category === "string"
        ? raw.category
        : typeof raw.name === "string"
          ? raw.name
          : typeof raw.label === "string"
            ? raw.label
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
    position,
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
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const nodes = rawNodes.map(normalizeZone).filter((node): node is ZoneNode => Boolean(node));
  const nodeAssets = rawNodes
    .filter((node) => !(isRecord(node) && node.type === "ZONE"))
    .map(normalizeAsset)
    .filter((asset): asset is SkeletonAsset => Boolean(asset));
  const rawAssets = Array.isArray(raw.assets)
    ? raw.assets.map(normalizeAsset).filter((asset): asset is SkeletonAsset => Boolean(asset))
    : [];
  const assets = [...rawAssets, ...nodeAssets];
  const inspection_history = parseInspectionHistory(raw.inspection_history);
  const fire_incidents = parseFireIncidentsFromSceneGraph(raw);

  return {
    building_id: sceneGraph.building_name || sceneGraph.building_id,
    scene_graph: {
      nodes,
      edges: Array.isArray(raw.edges) ? raw.edges : [],
      ...(assets.length > 0 ? { assets } : {}),
      ...(inspection_history ? { inspection_history } : {}),
      ...(fire_incidents.length > 0 ? { fire_incidents } : {}),
    },
  };
}

function rawSceneGraphNodes(sceneGraph: SceneGraph): unknown[] {
  return Array.isArray(sceneGraph.scene_graph.nodes) ? sceneGraph.scene_graph.nodes : [];
}

function createClientAssetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `facility-${crypto.randomUUID()}`;
  }

  return `facility-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function zoneAssetAddMutation(
  sceneGraph: SceneGraph,
  zoneId: string | undefined,
  asset: SkeletonAsset,
): SceneGraphMutation | null {
  if (!zoneId) return null;

  const zone = rawSceneGraphNodes(sceneGraph).find(
    (node) => isRecord(node) && node.type === "ZONE" && node.id === zoneId,
  );

  if (!isRecord(zone) || typeof zone.id !== "string") {
    return null;
  }

  const assets = Array.isArray(zone.assets) ? zone.assets : [];

  return {
    type: "UPDATE_NODE",
    payload: {
      node: {
        id: zone.id,
        assets: [...assets, asset],
      },
    },
  };
}

function zoneAssetRemoveMutation(
  sceneGraph: SceneGraph,
  assetId: string,
): SceneGraphMutation | null {
  for (const node of rawSceneGraphNodes(sceneGraph)) {
    if (!isRecord(node) || node.type !== "ZONE" || typeof node.id !== "string") {
      continue;
    }

    const assets = Array.isArray(node.assets) ? node.assets : [];
    if (!assets.some((asset) => isRecord(asset) && asset.id === assetId)) {
      continue;
    }

    return {
      type: "UPDATE_NODE",
      payload: {
        node: {
          id: node.id,
          assets: assets.filter((asset) => !(isRecord(asset) && asset.id === assetId)),
        },
      },
    };
  }

  return null;
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
  onSceneGraphChange,
  onFireIncidentsChange,
}: EmbeddedBuildingSceneViewerProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedFireId, setSelectedFireId] = useState<string | null>(null);
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
  const [contextTarget, setContextTarget] = useState<SceneContextTarget | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingAssetTarget, setPendingAssetTarget] = useState<SceneContextTarget | null>(null);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetSubmitting, setAssetSubmitting] = useState(false);

  const canManageFires = enableFacilityTools && Boolean(buildingId);
  const firefighterZoneView = !enableFacilityTools;
  const showFireLayer = Boolean(buildingId);
  /** 시설 페이지 「Activate Response」와 연동 */
  const responseActive = canManageFires && isEmergency;
  const firePlacementActive = responseActive;
  const firePanelVisible = responseActive || (showFireLayer && !canManageFires && firePanelOpen);
  const [searchFilters, setSearchFilters] = useState<ViewerSearchFilters>(DEFAULT_VIEWER_SEARCH_FILTERS);
  const [layerVisibility, setLayerVisibility] = useState<ViewerLayerVisibility>(
    enableFacilityTools ? DEFAULT_LAYER_VISIBILITY : FIREFIGHTER_LAYER_VISIBILITY,
  );
  const [shellDisplay, setShellDisplay] =
    useState<ViewerShellDisplay>(DEFAULT_SHELL_DISPLAY);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const cameraSeqRef = useRef(0);

  const doc = useMemo(() => (sceneGraph ? toSkeletonDocument(sceneGraph) : null), [sceneGraph]);
  const zones = doc?.scene_graph.nodes ?? [];
  const buildingInspectionHistory = doc?.scene_graph.inspection_history;
  const assets = useMemo(() => (doc ? collectAssets(doc) : []), [doc]);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const assetClassOptions = useMemo(() => uniqueAssetClasses(assets), [assets]);
  const searchResults = useMemo(() => {
    const results = runViewerSearch(zones, assets, searchFilters);
    return enableFacilityTools ? results : results.filter((result) => result.kind === "zone");
  }, [zones, assets, searchFilters, enableFacilityTools]);
  const searchFiltersActive = hasActiveViewerSearch(searchFilters);
  const zoneSearchHighlightActive =
    searchFiltersActive && shouldSearchZones(searchFilters);

  const { zoneIds: highlightZoneIds, assetIds: highlightAssetIds } = useMemo(() => {
    const sets = highlightSetsFromResults(searchFiltersActive ? searchResults : [], {
      includeZones: zoneSearchHighlightActive,
    });
    return enableFacilityTools
      ? sets
      : { zoneIds: sets.zoneIds, assetIds: new Set<string>() };
  }, [searchFiltersActive, searchResults, enableFacilityTools, zoneSearchHighlightActive]);

  const canvasLayerVisibility = useMemo(
    () =>
      enableFacilityTools
        ? layerVisibility
        : {
            shell: layerVisibility.shell,
            facility: false,
            structure: layerVisibility.structure,
            fires: layerVisibility.fires,
          },
    [enableFacilityTools, layerVisibility],
  );

  const fireZoneIds = useMemo(
    () => (firefighterZoneView ? zoneIdsContainingFireIncidents(zones, fireIncidents) : undefined),
    [firefighterZoneView, zones, fireIncidents],
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
    if (!assets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(null);
    }
  }, [assets, selectedAssetId, enableFacilityTools]);

  const searchFocusBounds = useMemo(() => {
    if (!enableFacilityTools || !searchFiltersActive) return null;
    if (highlightAssetIds.size === 0 && highlightZoneIds.size === 0) return null;
    return boundsFromSubset(
      zones,
      canvasAssets,
      highlightZoneIds,
      highlightAssetIds,
    );
  }, [
    enableFacilityTools,
    searchFiltersActive,
    zones,
    canvasAssets,
    highlightZoneIds,
    highlightAssetIds,
  ]);

  const searchFocusKey = useMemo(() => {
    if (!searchFocusBounds) return "";
    return `${searchFocusBounds.min.join(",")}|${searchFocusBounds.max.join(",")}`;
  }, [searchFocusBounds]);

  const rawNodeCount = sceneGraph?.scene_graph.nodes?.length ?? 0;
  const rawEdgeCount = sceneGraph?.scene_graph.edges?.length ?? 0;
  const hasSelection = Boolean(selectedAssetId || selectedZoneId);

  const pushCamera = useCallback((action: CameraCommandAction) => {
    cameraSeqRef.current += 1;
    setCameraCommand({ seq: cameraSeqRef.current, action });
  }, []);

  useEffect(() => {
    if (!searchFocusKey || !searchFocusBounds) return;
    const timer = window.setTimeout(() => {
      pushCamera({
        type: "focus-bounds",
        min: searchFocusBounds.min,
        max: searchFocusBounds.max,
        intensity: "medium",
      });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchFocusKey, searchFocusBounds, pushCamera]);

  const handleSelectAsset = useCallback(
    (id: string) => {
      setSelectedAssetId(id);
      setSelectedFireId(null);
      setSidePanelOpen(true);
      setSearchOpen(false);
      const asset = assets.find((item) => item.id === id);
      if (asset?.zoneId) setSelectedZoneId(asset.zoneId);
      pushCamera({ type: "focus-asset", assetId: id, intensity: "subtle" });
    },
    [assets, pushCamera],
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

  const commitSceneGraphMutations = useCallback(
    async (mutations: SceneGraphMutation[]) => {
      if (!buildingId || !sceneGraph) {
        throw new Error("Scene graph가 준비되지 않았습니다.");
      }

      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      const applyWithBase = (baseGraphDataId: string) =>
        applySceneGraphMutations({
          accessToken: token,
          buildingId,
          baseGraphDataId,
          mutations,
        });

      try {
        const next = await applyWithBase(sceneGraph.graph_data_id);
        onSceneGraphChange?.(next);
        return next;
      } catch (error) {
        if (getAxiosErrorStatus(error) !== 409) {
          throw error;
        }

        const latest = await getBuildingSceneGraph(token, buildingId);
        onSceneGraphChange?.(latest);
        const next = await applyWithBase(latest.graph_data_id);
        onSceneGraphChange?.(next);
        return next;
      }
    },
    [buildingId, sceneGraph, onSceneGraphChange],
  );

  const closeContextMenu = useCallback(() => {
    setContextTarget(null);
    setContextMenuPosition(null);
  }, []);

  useEffect(() => {
    if (!contextTarget) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && contextMenuRef.current?.contains(target)) {
        return;
      }

      closeContextMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeContextMenu, contextTarget]);

  const zoneForContextTarget = useCallback(
    (target: SceneContextTarget) =>
      target.zoneId
        ? { zoneId: target.zoneId, zoneName: target.zoneName }
        : findZoneForAssetPosition(zones, target.position),
    [zones],
  );

  const handleCanvasContextPick = useCallback(
    (target: SceneContextTarget) => {
      if (!enableFacilityTools) return;

      const rect = canvasWrapRef.current?.getBoundingClientRect();
      if (!rect) return;

      setContextTarget(target);
      setContextMenuPosition({
        x: Math.min(Math.max(target.clientX - rect.left, 8), rect.width - 190),
        y: Math.min(Math.max(target.clientY - rect.top, 8), rect.height - 150),
      });

      if (target.assetId) {
        handleSelectAsset(target.assetId);
      }
      if (target.fireId) {
        setSelectedFireId(target.fireId);
      }
    },
    [enableFacilityTools, handleSelectAsset],
  );

  const openAssetAddDialog = useCallback(() => {
    if (!contextTarget) return;
    setPendingAssetTarget(contextTarget);
    setAssetName("");
    setAssetDialogOpen(true);
    closeContextMenu();
  }, [closeContextMenu, contextTarget]);

  const handleConfirmAssetAdd = useCallback(async () => {
    if (!pendingAssetTarget) return;

    const name = assetName.trim();
    if (!name) {
      alert("시설물 이름을 입력해주세요.");
      return;
    }

    const zone = zoneForContextTarget(pendingAssetTarget);
    const metadata: Record<string, unknown> = {
      facility_type: name,
    };
    if (zone?.zoneId) metadata.zone_id = zone.zoneId;
    if (zone?.zoneName) metadata.zone_name = zone.zoneName;

    setAssetSubmitting(true);
    try {
      const addNodeMutation: SceneGraphMutation = {
        type: "ADD_NODE",
        payload: {
          node: {
            type: "facility",
            label: name,
            position: vec3ToSceneGraphPosition(pendingAssetTarget.position),
            metadata,
          },
        },
      };
      const addAssetMutation = sceneGraph
        ? zoneAssetAddMutation(sceneGraph, zone?.zoneId, {
            id: createClientAssetId(),
            class: name,
            position: pendingAssetTarget.position,
            status: "normal",
          })
        : null;
      const mutationCandidates = addAssetMutation
        ? [addAssetMutation, addNodeMutation]
        : [addNodeMutation];
      let lastError: unknown;

      for (const mutation of mutationCandidates) {
        try {
          await commitSceneGraphMutations([mutation]);
          lastError = null;
          break;
        } catch (error) {
          const status = getAxiosErrorStatus(error);
          if (status !== 400 && status !== 422) {
            throw error;
          }
          lastError = error;
        }
      }

      if (lastError) {
        throw lastError;
      }

      setAssetDialogOpen(false);
      setAssetName("");
      setPendingAssetTarget(null);
    } catch {
      alert("시설물을 추가하지 못했습니다. 로그인 상태와 scene graph 최신 상태를 확인해주세요.");
    } finally {
      setAssetSubmitting(false);
    }
  }, [assetName, commitSceneGraphMutations, pendingAssetTarget, sceneGraph, zoneForContextTarget]);

  const handleRemoveContextAsset = useCallback(async () => {
    if (!contextTarget?.assetId) return;
    if (!confirm(`${contextTarget.assetClass ?? "시설물"}을 삭제할까요?`)) return;

    const nodeId = contextTarget.assetId;
    const updateZoneAssetsMutation = sceneGraph
      ? zoneAssetRemoveMutation(sceneGraph, nodeId)
      : null;
    const removeMutationCandidates: SceneGraphMutation[] = [
      ...(updateZoneAssetsMutation ? [updateZoneAssetsMutation] : []),
      {
        type: "REMOVE_NODE",
        payload: {
          node_id: nodeId,
        },
      },
      {
        type: "REMOVE_NODE",
        payload: {
          node: {
            id: nodeId,
          },
        },
      },
      {
        type: "REMOVE_NODE",
        payload: {
          id: nodeId,
        },
      },
    ];

    try {
      let lastError: unknown;

      for (const mutation of removeMutationCandidates) {
        try {
          await commitSceneGraphMutations([mutation]);
          lastError = null;
          break;
        } catch (error) {
          const status = getAxiosErrorStatus(error);
          if (status !== 400 && status !== 422) {
            throw error;
          }
          lastError = error;
        }
      }

      if (lastError) {
        throw lastError;
      }

      setSelectedAssetId((current) => (current === nodeId ? null : current));
      closeContextMenu();
    } catch {
      alert("시설물을 삭제하지 못했습니다.");
    }
  }, [closeContextMenu, commitSceneGraphMutations, contextTarget, sceneGraph]);

  const openFireAddDialog = useCallback(() => {
    if (!contextTarget) return;

    const zone = zoneForContextTarget(contextTarget);
    setPendingPlacement({
      position: contextTarget.position,
      zoneId: zone?.zoneId,
      zoneName: zone?.zoneName,
    });
    setDraftFirePosition(contextTarget.position);
    setRegisterDialogOpen(true);
    closeContextMenu();
  }, [closeContextMenu, contextTarget, zoneForContextTarget]);

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

      const user = getStoredAuthUser();
      const overlay: Record<string, unknown> = {
        type: "FIRE",
        position: vec3ToSceneGraphPosition(pendingPlacement.position),
        severity: severity.toUpperCase(),
        status: "ACTIVE",
      };
      if (pendingPlacement.zoneId) {
        overlay.target_node_id = pendingPlacement.zoneId;
        overlay.zone_id = pendingPlacement.zoneId;
      }
      if (pendingPlacement.zoneName) overlay.zone_name = pendingPlacement.zoneName;
      if (note) overlay.note = note;
      if (user?.email) overlay.reported_by = user.email;

      setFireSubmitting(true);
      try {
        await commitSceneGraphMutations([
          {
            type: "ADD_OVERLAY",
            payload: {
              overlay_type: "incidents",
              overlay,
            },
          },
        ]);
        setLayerVisibility((value) => ({ ...value, fires: true }));
        setSelectedFireId(null);
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
    [pendingPlacement, buildingId, commitSceneGraphMutations, onFireIncidentsChange],
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

      try {
        await commitSceneGraphMutations([
          {
            type: "REMOVE_OVERLAY",
            payload: {
              overlay_type: "incidents",
              overlay_id: id,
            },
          },
        ]);
        setFireIncidents((current) => current.filter((item) => item.id !== id));
        setSelectedFireId((current) => (current === id ? null : current));
        onFireIncidentsChange?.();
      } catch {
        alert("화재 위치를 삭제하지 못했습니다.");
      }
    },
    [buildingId, commitSceneGraphMutations, onFireIncidentsChange],
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
      onContextMenu={(event) => {
        if (enableFacilityTools) {
          event.preventDefault();
        }
      }}
    >
      {zones.length > 0 ? (
        <ViewerMinimap
          zones={zones}
          selectedZoneId={selectedZoneId}
          highlightZoneIds={highlightZoneIds}
          onSelectZone={(zoneId) => {
            if (firePlacementActive) return;
            setSelectedZoneId(zoneId);
            setSelectedAssetId(null);
            setSelectedFireId(null);
          }}
          onFocusZone={(zoneId) => {
            pushCamera({ type: "focus-zone", zoneId, intensity: "medium" });
          }}
        />
      ) : null}
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
          shellDisplay={shellDisplay}
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
          onToggleShell={() =>
            setLayerVisibility((value) => ({ ...value, shell: !value.shell }))
          }
          onToggleFacility={() =>
            setLayerVisibility((value) => ({ ...value, facility: !value.facility }))
          }
          onToggleStructure={() =>
            setLayerVisibility((value) => ({ ...value, structure: !value.structure }))
          }
          onToggleFires={
            showFireLayer
              ? () => setLayerVisibility((value) => ({ ...value, fires: !value.fires }))
              : undefined
          }
          onToggleShellTransparent={() =>
            setShellDisplay((value) => ({ ...value, transparent: !value.transparent }))
          }
          onToggleShellOpenRoof={() =>
            setShellDisplay((value) => ({ ...value, openRoof: !value.openRoof }))
          }
        />
      ) : showFireLayer ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2 px-3">
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
          <button
            type="button"
            onClick={() =>
              setShellDisplay((value) => ({ ...value, transparent: !value.transparent }))
            }
            className={cn(
              viewerGlass.overlayLight,
              "rounded-full px-4 py-2 text-[10px] font-semibold tracking-wide shadow-lg",
              shellDisplay.transparent
                ? "bg-red-950 text-white"
                : "text-red-900",
            )}
          >
            반투명 {shellDisplay.transparent ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() =>
              setShellDisplay((value) => ({ ...value, openRoof: !value.openRoof }))
            }
            className={cn(
              viewerGlass.overlayLight,
              "rounded-full px-4 py-2 text-[10px] font-semibold tracking-wide shadow-lg",
              shellDisplay.openRoof
                ? "bg-red-950 text-white"
                : "text-red-900",
            )}
          >
            천장 OFF {shellDisplay.openRoof ? "ON" : "OFF"}
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
          selectedAssetId={selectedAssetId}
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
              "pointer-events-auto absolute bottom-44 left-3 z-30 flex max-h-[min(48%,380px)] w-[min(100%,320px)] flex-col overflow-hidden rounded-2xl shadow-xl",
              sidePanelOpen && "max-w-[min(280px,calc(100%-2rem))]",
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

      {enableFacilityTools && contextTarget && contextMenuPosition ? (
        <div
          ref={contextMenuRef}
          className={cn(
            viewerGlass.overlayLight,
            "pointer-events-auto absolute z-40 w-48 overflow-hidden rounded-xl border border-white/50 p-1.5 shadow-2xl",
          )}
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="px-2 py-1.5">
            <p className={cn(viewerType.mono, "truncate text-[10px] text-zinc-500")}>
              {contextTarget.position.map((value) => value.toFixed(1)).join(", ")}
            </p>
          </div>
          {contextTarget.assetId ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
              onClick={() => void handleRemoveContextAsset()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              시설물 삭제
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-zinc-800 hover:bg-white/80"
              onClick={openAssetAddDialog}
            >
              <Plus className="h-3.5 w-3.5" />
              시설물 추가
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-800 hover:bg-red-50"
            onClick={openFireAddDialog}
          >
            <Flame className="h-3.5 w-3.5" />
            화재 발생 추가
          </button>
          {contextTarget.fireId ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
              onClick={() => {
                const fireId = contextTarget.fireId;
                closeContextMenu();
                if (fireId) void handleRemoveFire(fireId);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              화재 발생 삭제
            </button>
          ) : null}
        </div>
      ) : null}

      <BuildingSceneCanvas
        zones={zones}
        assets={canvasAssets}
        selectedZoneId={selectedZoneId}
        selectedAssetId={enableFacilityTools ? selectedAssetId : null}
        hoveredAssetId={null}
        placementMode={firePlacementActive}
        draftPosition={firePlacementActive ? draftFirePosition : null}
        draftClass="화재"
        placementVariant={firePlacementActive ? "fire" : "default"}
        fireIncidents={showFireLayer ? fireIncidents : []}
        selectedFireId={selectedFireId}
        onSelectFire={setSelectedFireId}
        layerVisibility={canvasLayerVisibility}
        shellDisplay={shellDisplay}
        cameraCommand={cameraCommand}
        searchHighlightActive={searchFiltersActive}
        zoneSearchHighlightActive={zoneSearchHighlightActive}
        highlightZoneIds={highlightZoneIds}
        highlightAssetIds={highlightAssetIds}
        firefighterZoneView={firefighterZoneView}
        fireZoneIds={fireZoneIds}
        sceneTheme={isEmergency ? "emergency" : "day"}
        onSelectZone={(id) => {
          if (firePlacementActive) return;
          setSelectedZoneId(id);
          if (id !== null) {
            setSelectedAssetId(null);
            setSelectedFireId(null);
          }
        }}
        onSelectAsset={enableFacilityTools ? handleSelectAsset : () => {}}
        onContextPick={enableFacilityTools ? handleCanvasContextPick : undefined}
        onClearSelection={() => {
          if (firePlacementActive) return;
          setSelectedZoneId(null);
          setSelectedAssetId(null);
          setSelectedFireId(null);
        }}
        onPlacementPick={(position) => {
          if (firePlacementActive) {
            handleFirePlacementPick(position);
          }
        }}
      />

      <Dialog
        open={assetDialogOpen}
        onOpenChange={(next) => {
          if (next || assetSubmitting) return;
          setAssetDialogOpen(false);
          setPendingAssetTarget(null);
          setAssetName("");
        }}
      >
        <DialogContent className="max-w-md border-red-900/15 bg-white/95">
          <DialogHeader>
            <DialogTitle>시설물 추가</DialogTitle>
            <DialogDescription>
              우클릭한 좌표에 추가할 시설물 이름을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="asset-name">시설물 이름</Label>
            <Input
              id="asset-name"
              value={assetName}
              disabled={assetSubmitting}
              placeholder="예: 소화기"
              onChange={(event) => setAssetName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleConfirmAssetAdd();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={assetSubmitting}
              onClick={() => {
                setAssetDialogOpen(false);
                setPendingAssetTarget(null);
                setAssetName("");
              }}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={assetSubmitting}
              className="bg-red-950 text-white hover:bg-red-900"
              onClick={() => void handleConfirmAssetAdd()}
            >
              {assetSubmitting ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
