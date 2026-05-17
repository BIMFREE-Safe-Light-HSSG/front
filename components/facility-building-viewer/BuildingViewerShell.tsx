"use client";

import dynamic from "next/dynamic";

import Link from "next/link";

import { ArrowLeft, Plus, Search } from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { AssetDetailPanel } from "@/components/facility-building-viewer/AssetDetailPanel";

import { AssetEditorPanel } from "@/components/facility-building-viewer/AssetEditorPanel";

import { AssetHoverTooltip } from "@/components/facility-building-viewer/AssetHoverTooltip";

import { AssetListPanel } from "@/components/facility-building-viewer/AssetListPanel";

import { ViewerSearchPanel } from "@/components/facility-building-viewer/ViewerSearchPanel";
import { ViewerCanvasNavBar } from "@/components/facility-building-viewer/ViewerCanvasNavBar";
import {
  DEFAULT_LAYER_VISIBILITY,
  type CameraCommand,
  type CameraCommandAction,
  type ViewerLayerVisibility,
} from "@/components/facility-building-viewer/scene-camera-types";

import {
  ViewerCanvasBadge,
  ViewerIconFab,
  ViewerPanel,
  ViewerSectionHeader,
  ViewerStatPill,
  ViewerTab,
  ViewerSegmentedTabs,
  viewerGlass,
  viewerType,
} from "@/components/facility-building-viewer/viewer-design";

import { LiquidGlassPageShell } from "@/components/layout/liquid-glass-page-shell";

import { LiquidGlassSectionHeader } from "@/components/layout/liquid-glass-section-header";

import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";

import type { FacilityDataId } from "@/lib/facility-list-types";

import {
  createSceneGraphAsset,
  deleteSceneGraphAsset,
  fetchSceneGraphSkeleton,
} from "@/lib/scene-graph-skeleton/api-client";

import {
  collectAssets,
  uniqueAssetClasses,
} from "@/lib/scene-graph-skeleton/assets";

import {
  DEFAULT_VIEWER_SEARCH_FILTERS,
  hasActiveViewerSearch,
  highlightSetsFromResults,
  runViewerSearch,
  type ViewerSearchFilters,
  type ViewerSearchResult,
} from "@/lib/scene-graph-skeleton/search";

import { confirmDeleteAsset } from "@/lib/scene-graph-skeleton/confirm-delete-asset";
import { zoneAccentColor } from "@/lib/scene-graph-skeleton/zone-geometry";
import type {
  FacilityAssetRef,
  SceneGraphSkeleton,
  Vec3,
  ZoneNode,
} from "@/lib/scene-graph-skeleton/types";

import { cn } from "@/lib/utils";

const BuildingSceneCanvas = dynamic(
  () =>
    import("@/components/facility-building-viewer/BuildingSceneCanvas").then(
      (m) => m.BuildingSceneCanvas,
    ),

  {
    ssr: false,
    loading: () => <ScenePlaceholder label="3D 뷰어 불러오는 중…" />,
  },
);

type SidebarTab = "zones" | "assets";

function ScenePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 rounded-3xl bg-zinc-950/60">
      <motion.div
        className="h-10 w-10 rounded-full border-2 border-red-900/30 border-t-red-500"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />

      <p className={cn(viewerType.mono, "text-zinc-400")}>{label}</p>
    </div>
  );
}

export type BuildingViewerShellProps = {
  dataId: FacilityDataId;
};

export function BuildingViewerShell({ dataId }: BuildingViewerShellProps) {
  const [doc, setDoc] = useState<SceneGraphSkeleton | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("assets");

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);

  const [hoverAnchor, setHoverAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [assetClassFilter, setAssetClassFilter] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);

  const [placementMode, setPlacementMode] = useState(false);

  const [draftPosition, setDraftPosition] = useState<Vec3 | null>(null);

  const [draftClass, setDraftClass] = useState("소화기");

  const [searchOpen, setSearchOpen] = useState(false);

  const [searchFilters, setSearchFilters] = useState<ViewerSearchFilters>(
    DEFAULT_VIEWER_SEARCH_FILTERS,
  );

  const [layerVisibility, setLayerVisibility] = useState<ViewerLayerVisibility>(
    DEFAULT_LAYER_VISIBILITY,
  );

  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(
    null,
  );

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const cameraSeqRef = useRef(0);
  const selectionFlySkipRef = useRef(true);

  const reload = useCallback(async (signal?: AbortSignal) => {
    return fetchSceneGraphSkeleton(signal);
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    setLoading(true);

    setError(null);

    reload(ac.signal)
      .then(setDoc)

      .catch((e) => {
        if (
          ac.signal.aborted ||
          (e instanceof DOMException && e.name === "AbortError")
        )
          return;

        setDoc(null);

        setError(e instanceof Error ? e.message : String(e));
      })

      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [reload]);

  const zones = useMemo(
    () =>
      (doc?.scene_graph.nodes ?? []).filter(
        (n): n is ZoneNode => n.type === "ZONE",
      ),

    [doc],
  );

  const assets = useMemo(() => (doc ? collectAssets(doc) : []), [doc]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) ?? null;

  const hoveredAsset = assets.find((a) => a.id === hoveredAssetId) ?? null;

  const assetClassOptions = useMemo(() => uniqueAssetClasses(assets), [assets]);

  const searchResults = useMemo(
    () => runViewerSearch(zones, assets, searchFilters),

    [zones, assets, searchFilters],
  );

  const searchFiltersActive = hasActiveViewerSearch(searchFilters);

  const searchHighlightActive = searchFiltersActive;

  const { zoneIds: highlightZoneIds, assetIds: highlightAssetIds } = useMemo(
    () => highlightSetsFromResults(searchFiltersActive ? searchResults : []),

    [searchFiltersActive, searchResults],
  );

  const closeEditor = useCallback(() => {
    setEditorOpen(false);

    setPlacementMode(false);

    setDraftPosition(null);
  }, []);

  const openEditor = useCallback(() => {
    setSidebarTab("assets");

    setEditorOpen(true);

    setSelectedAssetId(null);
  }, []);

  const handleSelectAsset = useCallback(
    (id: string) => {
      setSelectedAssetId(id);

      setSidebarTab("assets");

      setEditorOpen(false);

      setPlacementMode(false);

      const asset = assets.find((a) => a.id === id);

      if (asset?.zoneId) setSelectedZoneId(asset.zoneId);
    },

    [assets],
  );

  const handleCreateAsset = useCallback(
    async (payload: { class: string; position: Vec3 }) => {
      setSaving(true);

      setError(null);

      try {
        const next = await createSceneGraphAsset({
          class: payload.class,

          position: payload.position,

          status: "normal",
        });

        setDoc(next);

        const created =
          next.scene_graph.assets?.[next.scene_graph.assets.length - 1] ??
          collectAssets(next).find((a) =>
            a.position.every(
              (v, i) => Math.abs(v - payload.position[i]!) < 1e-3,
            ),
          );

        if (created) setSelectedAssetId(created.id);

        closeEditor();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },

    [closeEditor],
  );

  const handleSelectSearchResult = useCallback(
    (result: ViewerSearchResult) => {
      if (result.kind === "zone") {
        setSelectedZoneId(result.id);

        setSelectedAssetId(null);

        setSidebarTab("zones");

        closeEditor();
      } else {
        handleSelectAsset(result.id);
      }
    },

    [closeEditor, handleSelectAsset],
  );

  const handleDeleteAsset = useCallback(async (asset: FacilityAssetRef) => {
    setDeletingAssetId(asset.id);
    setSaving(true);
    setError(null);

    try {
      const next = await deleteSceneGraphAsset(asset.id);
      setDoc(next);
      setSelectedAssetId(null);
      setHoveredAssetId(null);
      setHoverAnchor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingAssetId(null);
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete") return;
      if (editorOpen || placementMode || searchOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!selectedAssetId || deletingAssetId) return;
      const asset = assets.find((a) => a.id === selectedAssetId);
      if (!asset) return;
      e.preventDefault();
      if (confirmDeleteAsset(asset)) void handleDeleteAsset(asset);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    assets,
    deletingAssetId,
    editorOpen,
    handleDeleteAsset,
    placementMode,
    searchOpen,
    selectedAssetId,
  ]);

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

  useEffect(() => {
    if (selectionFlySkipRef.current) {
      selectionFlySkipRef.current = false;
      return;
    }
    if (placementMode) return;
    if (selectedAssetId) {
      pushCamera({
        type: "focus-asset",
        assetId: selectedAssetId,
        intensity: "subtle",
      });
    } else if (selectedZoneId) {
      pushCamera({
        type: "focus-zone",
        zoneId: selectedZoneId,
        intensity: "subtle",
      });
    }
  }, [selectedAssetId, selectedZoneId, placementMode, pushCamera]);

  const hasSelection = Boolean(selectedAssetId || selectedZoneId);

  return (
    <LiquidGlassPageShell
      maxWidth="full"
      glassClassName="mx-auto w-full px-4 pb-8"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2 h-8 gap-1.5 rounded-full px-3 text-xs text-zinc-600 hover:bg-white/50 hover:text-red-950"
          >
            <Link href="/viewer">
              <ArrowLeft className="h-3.5 w-3.5" />
              시설 목록
            </Link>
          </Button>

          <LiquidGlassSectionHeader
            className="mb-0 border-l-0 pl-0"
            eyebrow={`Facility · ${dataId}`}
            title={
              <>
                {doc?.building_id ?? "Building"}{" "}
                <span className="text-red-800/25 [-webkit-text-stroke:1px_#991b1b]">
                  Dashboard
                </span>
              </>
            }
            description="구역·시설을 3D에서 탐색하고, 등록·삭제는 scene graph에 즉시 반영됩니다."
          />
        </div>

        <div className="flex shrink-0 gap-3">
          <ViewerStatPill label="구역" value={zones.length} />

          <ViewerStatPill label="시설" value={assets.length} />
        </div>
      </div>

      {error ? (
        <p
          className="mb-4 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-2.5 text-sm text-red-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="grid h-[min(78vh,900px)] min-h-[480px] gap-5 lg:grid-cols-[minmax(272px,340px)_1fr]">
        <ViewerPanel className="flex min-h-0 flex-col">
          <ViewerSegmentedTabs>
            <ViewerTab
              active={sidebarTab === "zones"}
              onClick={() => setSidebarTab("zones")}
            >
              구역
            </ViewerTab>

            <ViewerTab
              active={sidebarTab === "assets"}
              onClick={() => setSidebarTab("assets")}
            >
              시설 · {assets.length}
            </ViewerTab>
          </ViewerSegmentedTabs>

          {sidebarTab === "assets" ? (
            <div className="border-b border-red-900/10 px-3 py-2.5">
              <Button
                type="button"
                size="sm"
                className={cn(
                  "h-9 w-full gap-1.5 rounded-2xl text-xs font-semibold shadow-sm transition-all",

                  editorOpen
                    ? "bg-zinc-200/80 text-zinc-800 hover:bg-zinc-200"
                    : "bg-red-950 text-white hover:bg-red-900",
                )}
                variant={editorOpen ? "secondary" : "default"}
                onClick={() => (editorOpen ? closeEditor() : openEditor())}
              >
                <Plus className="h-3.5 w-3.5" />

                {editorOpen ? "등록 취소" : "시설 추가"}
              </Button>
            </div>
          ) : null}

          {sidebarTab === "zones" ? (
            <>
              <ViewerSectionHeader
                title="구역 목록"
                hint={
                  selectedZone
                    ? `선택: ${selectedZone.name}`
                    : "3D 뷰 또는 목록에서 구역을 선택하세요"
                }
              />

              <ScrollArea className="min-h-0 flex-1">
                <ul className="space-y-1 p-2.5">
                  {loading ? (
                    <li
                      className={cn(
                        viewerType.mono,
                        "px-3 py-8 text-center text-zinc-400",
                      )}
                    >
                      불러오는 중…
                    </li>
                  ) : (
                    zones.map((zone, index) => {
                      const active = selectedZoneId === zone.id;

                      const color = zoneAccentColor(index);

                      const hex = `#${color.toString(16).padStart(6, "0")}`;

                      return (
                        <li key={zone.id}>
                          <ZoneListButton
                            active={active}
                            hex={hex}
                            name={zone.name}
                            id={zone.id}
                            height={zone.geometry.height}
                            onClick={() => {
                              setSelectedZoneId(zone.id);

                              setSelectedAssetId(null);

                              closeEditor();
                            }}
                          />
                        </li>
                      );
                    })
                  )}
                </ul>
              </ScrollArea>
            </>
          ) : (
            <AssetListPanel
              assets={assets}
              classFilter={assetClassFilter}
              onClassFilterChange={setAssetClassFilter}
              selectedAssetId={selectedAssetId}
              hoveredAssetId={hoveredAssetId}
              deletingAssetId={deletingAssetId}
              onSelectAsset={handleSelectAsset}
              onHoverAsset={setHoveredAssetId}
              onDeleteAsset={(asset) => void handleDeleteAsset(asset)}
            />
          )}

          <AnimatePresence>
            {editorOpen ? (
              <AssetEditorPanel
                open={editorOpen}
                placementMode={placementMode}
                draftPosition={draftPosition}
                saving={saving}
                onClose={closeEditor}
                onTogglePlacement={() => setPlacementMode((v) => !v)}
                onPositionChange={setDraftPosition}
                onClassChange={setDraftClass}
                onSubmit={(payload) => {
                  setDraftClass(payload.class);

                  void handleCreateAsset(payload);
                }}
              />
            ) : null}
          </AnimatePresence>

          {selectedAsset && sidebarTab === "assets" && !editorOpen ? (
            <AssetDetailPanel
              asset={selectedAsset}
              deleting={deletingAssetId === selectedAsset.id}
              onDelete={(id) => {
                const asset = assets.find((a) => a.id === id);
                if (asset) void handleDeleteAsset(asset);
              }}
            />
          ) : null}
        </ViewerPanel>

        <div
          ref={canvasWrapRef}
          className={cn(
            viewerGlass.canvas,

            "min-h-[420px]",

            placementMode &&
              "ring-2 ring-sky-400/40 ring-offset-2 ring-offset-[#fffafa]",
          )}
          onPointerMove={(e) => {
            if (hoveredAssetId && !placementMode)
              updateHoverAnchor(e.clientX, e.clientY);
          }}
          onPointerLeave={() => {
            setHoverAnchor(null);

            if (!placementMode) setHoveredAssetId(null);
          }}
        >
          <div className={viewerGlass.canvasVignette} aria-hidden />

          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <ViewerIconFab
              active={searchOpen || searchFiltersActive}
              label="검색 및 필터"
              icon={Search}
              onClick={() => setSearchOpen((v) => !v)}
            />
          </div>

          {!loading && doc ? (
            <ViewerCanvasNavBar
              layerVisibility={layerVisibility}
              hasSelection={hasSelection}
              onResetView={() => pushCamera({ type: "preset", preset: "reset" })}
              onTopView={() => pushCamera({ type: "preset", preset: "top" })}
              onIsoView={() => pushCamera({ type: "preset", preset: "iso" })}
              onFocusSelection={() => {
                if (selectedAssetId) {
                  pushCamera({
                    type: "focus-asset",
                    assetId: selectedAssetId,
                    intensity: "medium",
                  });
                } else if (selectedZoneId) {
                  pushCamera({
                    type: "focus-zone",
                    zoneId: selectedZoneId,
                    intensity: "medium",
                  });
                }
              }}
              onToggleZones={() =>
                setLayerVisibility((v) => ({ ...v, zones: !v.zones }))
              }
              onToggleAssets={() =>
                setLayerVisibility((v) => ({ ...v, assets: !v.assets }))
              }
            />
          ) : null}

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

          {placementMode ? (
            <motion.div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center pr-14">
              <ViewerCanvasBadge variant="placement">
                바닥·구역 면을 클릭해 위치 지정
              </ViewerCanvasBadge>
            </motion.div>
          ) : null}

          {searchHighlightActive ? (
            <motion.div className="pointer-events-none absolute top-3 left-3 z-10">
              <ViewerCanvasBadge variant="search">
                검색 {searchResults.length}건
              </ViewerCanvasBadge>
            </motion.div>
          ) : null}

          {!loading && doc ? (
            <BuildingSceneCanvas
              zones={zones}
              assets={assets}
              selectedZoneId={selectedZoneId}
              selectedAssetId={selectedAssetId}
              hoveredAssetId={hoveredAssetId}
              placementMode={placementMode}
              draftPosition={draftPosition}
              draftClass={draftClass}
              layerVisibility={layerVisibility}
              cameraCommand={cameraCommand}
              searchHighlightActive={searchHighlightActive}
              highlightZoneIds={highlightZoneIds}
              highlightAssetIds={highlightAssetIds}
              onSelectZone={(id) => {
                if (placementMode) return;

                setSelectedZoneId(id);

                if (id !== null) setSelectedAssetId(null);
              }}
              onSelectAsset={handleSelectAsset}
              onHoverAsset={(id) => {
                if (placementMode) return;

                setHoveredAssetId(id);

                if (!id) setHoverAnchor(null);
              }}
              onClearSelection={() => {
                if (placementMode) return;

                setSelectedZoneId(null);

                setSelectedAssetId(null);

                setHoveredAssetId(null);

                setHoverAnchor(null);
              }}
              onPlacementPick={(position) => {
                setDraftPosition(position);

                setPlacementMode(false);
              }}
            />
          ) : (
            <ScenePlaceholder
              label={loading ? "Scene graph 불러오는 중…" : "데이터 없음"}
            />
          )}

          <AssetHoverTooltip
            asset={
              hoveredAsset && !selectedAsset && !placementMode
                ? hoveredAsset
                : null
            }
            anchor={hoverAnchor}
          />
        </div>
      </div>
    </LiquidGlassPageShell>
  );
}

function ZoneListButton({
  active,

  hex,

  name,

  id,

  height,

  onClick,
}: {
  active: boolean;

  hex: string;

  name: string;

  id: string;

  height: number;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl px-3 py-2.5 text-left text-sm transition-all duration-200",

        active
          ? "bg-red-950/12 text-red-950 ring-1 ring-red-900/25 shadow-sm"
          : "text-zinc-800 hover:bg-white/65",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/80"
          style={{ backgroundColor: hex }}
          aria-hidden
        />

        <span className="font-semibold">{name}</span>
      </span>

      <span className={cn(viewerType.mono, "mt-1 block pl-[18px]")}>
        {id} · 높이 {height.toFixed(2)}m
      </span>
    </button>
  );
}
