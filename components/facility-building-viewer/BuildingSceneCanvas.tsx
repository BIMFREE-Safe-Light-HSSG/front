"use client";

import {
  Canvas,
  useFrame,
  type ThreeEvent,
} from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { AssetInstancedMarkers } from "@/components/facility-building-viewer/AssetInstancedMarkers";
import { SceneAssetPick } from "@/components/facility-building-viewer/SceneAssetPick";
import { AssetSpot } from "@/components/facility-building-viewer/AssetSpot";
import { FireIncidentsInstanced } from "@/components/facility-building-viewer/FireIncidentsInstanced";
import { AdaptiveSceneGrid } from "@/components/facility-building-viewer/AdaptiveSceneGrid";
import { MergedBuildingSlab } from "@/components/facility-building-viewer/MergedBuildingSlab";
import { MergedZoneRim } from "@/components/facility-building-viewer/MergedZoneRim";
import { MergedZoneShell } from "@/components/facility-building-viewer/MergedZoneShell";
import {
  SceneEnvironment,
  type ViewerSceneTheme,
} from "@/components/facility-building-viewer/SceneEnvironment";
import { listFacilityPickAssets } from "@/lib/scene-graph-skeleton/asset-pick";
import { partitionFacilityAssets } from "@/lib/scene-graph-skeleton/asset-marker-utils";
import { FireIncidentMarker } from "@/components/facility-building-viewer/FireIncidentMarker";
import { PlacementSurface } from "@/components/facility-building-viewer/PlacementSurface";
import { SceneCameraController } from "@/components/facility-building-viewer/SceneCameraController";
import {
  DEFAULT_SHELL_DISPLAY,
  type CameraCommand,
  type ViewerLayerVisibility,
  type ViewerShellDisplay,
} from "@/components/facility-building-viewer/scene-camera-types";
import { boundsFromZones } from "@/lib/scene-graph-skeleton/bounds";
import { threePointToSkeleton } from "@/lib/scene-graph-skeleton/coordinates";
import {
  createGlassZoneMaterial,
  createZoneExtrudeGeometry,
  createZoneShellWorldGeometry,
  createZoneFloorPickGeometry,
  createZoneOutlineGeometry,
  FIREFIGHTER_FIRE_ZONE_COLOR,
  FIREFIGHTER_NEUTRAL_ZONE_COLOR,
  zoneAccentColor,
  zoneMeshTransform,
} from "@/lib/scene-graph-skeleton/zone-geometry";
import type { SceneBounds } from "@/lib/scene-graph-skeleton/bounds";
import type { FireIncident } from "@/lib/fire-incidents/types";
import type {
  FacilityAssetRef,
  Vec3,
  ZoneNode,
} from "@/lib/scene-graph-skeleton/types";

export type BuildingSceneCanvasProps = {
  zones: ZoneNode[];
  assets: FacilityAssetRef[];
  selectedZoneId: string | null;
  selectedAssetId: string | null;
  hoveredAssetId: string | null;
  placementMode: boolean;
  draftPosition: Vec3 | null;
  draftClass: string;
  layerVisibility: ViewerLayerVisibility;
  shellDisplay?: ViewerShellDisplay;
  cameraCommand: CameraCommand | null;
  onSelectZone: (id: string | null) => void;
  onSelectAsset: (id: string) => void;
  onHoverAsset?: (id: string | null) => void;
  onClearSelection: () => void;
  onPlacementPick: (position: Vec3) => void;
  onContextPick?: (target: SceneContextTarget) => void;
  searchHighlightActive: boolean;
  /** false면 시설 필터 시 구역 dim/노란 하이라이트 없음 */
  zoneSearchHighlightActive?: boolean;
  highlightZoneIds: ReadonlySet<string>;
  highlightAssetIds: ReadonlySet<string>;
  fireIncidents?: FireIncident[];
  selectedFireId?: string | null;
  onSelectFire?: (id: string) => void;
  placementVariant?: "default" | "fire";
  /** 소방 뷰: 구역 단일색 + 화재 구역만 붉게 */
  firefighterZoneView?: boolean;
  fireZoneIds?: ReadonlySet<string>;
  sceneTheme?: ViewerSceneTheme;
};

export type SceneContextTarget = {
  position: Vec3;
  clientX: number;
  clientY: number;
  zoneId?: string;
  zoneName?: string;
  assetId?: string;
  assetClass?: string;
  fireId?: string;
};

function disableRaycast(mesh: THREE.Mesh | null) {
  if (mesh) mesh.raycast = () => {};
}

function shellGlassOpacity(base: number, xray: boolean): number {
  return xray ? Math.min(base * 0.48, 0.2) : base;
}

function ZonePanel({
  zone,
  index,
  selected,
  highlighted,
  dimmed,
  placementMode,
  showMesh,
  showShellFill,
  useMergedZoneShell,
  shellDisplay,
  firefighterZoneView,
  isFireZone,
  onSelect,
  onPlacementPick,
  onContextPick,
}: {
  zone: ZoneNode;
  index: number;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  placementMode: boolean;
  showMesh: boolean;
  /** false — MergedZoneShell이 fill 담당 */
  showShellFill: boolean;
  /** true — 구역 바닥 pick 비활성, shell 클릭으로 구역 선택 */
  useMergedZoneShell: boolean;
  shellDisplay: ViewerShellDisplay;
  firefighterZoneView: boolean;
  isFireZone: boolean;
  onSelect: (id: string) => void;
  onPlacementPick: (position: Vec3) => void;
  onContextPick?: (target: SceneContextTarget) => void;
}) {
  const fillRef = useRef<THREE.Mesh>(null);
  const floorPickRef = useRef<THREE.Mesh>(null);
  const color = firefighterZoneView
    ? isFireZone
      ? FIREFIGHTER_FIRE_ZONE_COLOR
      : FIREFIGHTER_NEUTRAL_ZONE_COLOR
    : zoneAccentColor(index);
  const shellXray = shellDisplay.transparent;
  const geometry = useMemo(() => {
    if (shellDisplay.openRoof) {
      return createZoneShellWorldGeometry(zone, true);
    }
    return createZoneExtrudeGeometry(zone);
  }, [zone, shellDisplay.openRoof]);
  const floorPick = useMemo(() => createZoneFloorPickGeometry(zone), [zone]);
  const outline = useMemo(() => createZoneOutlineGeometry(zone), [zone]);
  const glowOutline = useMemo(
    () => (selected && outline ? outline.clone() : null),
    [selected, outline],
  );

  const material = useMemo(() => {
    if (firefighterZoneView) {
      if (dimmed && !isFireZone) {
        return createGlassZoneMaterial(FIREFIGHTER_NEUTRAL_ZONE_COLOR, {
          opacity: shellGlassOpacity(0.06, shellXray),
        });
      }
      if (isFireZone) {
        return createGlassZoneMaterial(FIREFIGHTER_FIRE_ZONE_COLOR, {
          opacity: shellGlassOpacity(
            selected ? 0.62 : highlighted ? 0.56 : 0.48,
            shellXray,
          ),
          color: selected ? 0xfca5a5 : FIREFIGHTER_FIRE_ZONE_COLOR,
          emissive: 0xb91c1c,
          emissiveIntensity: selected ? 0.55 : highlighted ? 0.48 : 0.4,
        });
      }
      return createGlassZoneMaterial(FIREFIGHTER_NEUTRAL_ZONE_COLOR, {
        opacity: shellGlassOpacity(
          selected ? 0.38 : highlighted ? 0.34 : 0.28,
          shellXray,
        ),
        color: selected ? 0xc8d9eb : FIREFIGHTER_NEUTRAL_ZONE_COLOR,
        emissive: 0x1e3a5f,
        emissiveIntensity: selected ? 0.22 : 0.14,
      });
    }
    if (highlighted) {
      return createGlassZoneMaterial(color, {
        opacity: shellGlassOpacity(0.58, shellXray),
        color: 0xfff4a3,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.35,
      });
    }
    if (dimmed) {
      return createGlassZoneMaterial(color, {
        opacity: shellGlassOpacity(0.07, shellXray),
      });
    }
    return createGlassZoneMaterial(selected ? 0xffffff : color, {
      opacity: shellGlassOpacity(selected ? 0.42 : 0.3, shellXray),
    });
  }, [color, selected, highlighted, dimmed, firefighterZoneView, isFireZone, shellXray]);

  const outlineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: firefighterZoneView
          ? isFireZone
            ? selected
              ? 0xfca5a5
              : 0xef4444
            : selected
              ? 0xe2e8f0
              : FIREFIGHTER_NEUTRAL_ZONE_COLOR
          : highlighted
            ? 0xfde68a
            : selected
              ? 0xffffff
              : color,
        transparent: true,
        opacity: firefighterZoneView
          ? isFireZone
            ? 0.9
            : dimmed
              ? 0.18
              : selected
                ? 0.85
                : 0.5
          : highlighted
            ? 1
            : dimmed
              ? 0.2
              : selected
                ? 0.95
                : 0.55,
      }),
    [color, selected, highlighted, dimmed, firefighterZoneView, isFireZone],
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: firefighterZoneView
          ? isFireZone
            ? 0xf87171
            : FIREFIGHTER_NEUTRAL_ZONE_COLOR
          : highlighted
            ? 0xfbbf24
            : color,
        transparent: true,
        opacity: firefighterZoneView ? (isFireZone ? 0.95 : 0.45) : 0.85,
        depthWrite: false,
      }),
    [color, highlighted, firefighterZoneView, isFireZone],
  );

  const transform = useMemo(() => zoneMeshTransform(zone), [zone]);
  const floorPickMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  const outlineLine = useMemo(
    () => (outline ? new THREE.Line(outline, outlineMaterial) : null),
    [outline, outlineMaterial],
  );
  const glowLine = useMemo(
    () => (glowOutline ? new THREE.Line(glowOutline, glowMaterial) : null),
    [glowOutline, glowMaterial],
  );

  useEffect(() => {
    disableRaycast(fillRef.current);
    disableRaycast(floorPickRef.current);
    if (outlineLine) outlineLine.raycast = () => {};
    if (glowLine) glowLine.raycast = () => {};
    return () => {
      geometry?.dispose();
      floorPick?.dispose();
      outline?.dispose();
      glowOutline?.dispose();
      material.dispose();
      outlineMaterial.dispose();
      glowMaterial.dispose();
      floorPickMaterial.dispose();
    };
  }, [
    geometry,
    floorPick,
    outline,
    glowOutline,
    material,
    outlineMaterial,
    glowMaterial,
    floorPickMaterial,
    outlineLine,
    glowLine,
  ]);

  useFrame((state) => {
    if (!selected || !glowMaterial) return;
    const pulse = 0.45 + 0.45 * Math.sin(state.clock.elapsedTime * 4.2);
    glowMaterial.opacity = pulse;
  });

  if (!geometry && !floorPick) return null;

  const pickHandlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (placementMode) {
        onPlacementPick(threePointToSkeleton(e.point.x, e.point.y, e.point.z));
        return;
      }
      onSelect(zone.id);
    },
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      onContextPick?.({
        position: threePointToSkeleton(e.point.x, e.point.y, e.point.z),
        clientX: e.nativeEvent.clientX,
        clientY: e.nativeEvent.clientY,
        zoneId: zone.id,
        zoneName: zone.name,
      });
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = placementMode ? "crosshair" : "pointer";
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!placementMode) document.body.style.cursor = "auto";
    },
  };

  return (
    <group>
      {showMesh && showShellFill && geometry ? (
        <mesh
          ref={fillRef}
          geometry={geometry}
          material={material}
          {...(shellDisplay.openRoof
            ? {}
            : {
                position: transform.position,
                rotation: transform.rotation,
              })}
          renderOrder={1}
        />
      ) : null}
      {showMesh && outlineLine ? (
        <primitive object={outlineLine} renderOrder={2} />
      ) : null}
      {showMesh && selected && glowLine ? (
        <primitive object={glowLine} renderOrder={3} />
      ) : null}
      {floorPick ? (
        <mesh
          ref={floorPickRef}
          geometry={floorPick}
          material={floorPickMaterial}
          position={transform.position}
          rotation={transform.rotation}
          renderOrder={0}
          {...(useMergedZoneShell ? {} : pickHandlers)}
        />
      ) : null}
    </group>
  );
}

function SceneContent({
  zones,
  assets,
  selectedZoneId,
  selectedAssetId,
  hoveredAssetId,
  placementMode,
  draftPosition,
  draftClass,
  layerVisibility,
  shellDisplay = DEFAULT_SHELL_DISPLAY,
  cameraCommand,
  onSelectZone,
  onSelectAsset,
  onHoverAsset = () => {},
  onPlacementPick,
  onContextPick,
  searchHighlightActive,
  zoneSearchHighlightActive = false,
  highlightZoneIds,
  highlightAssetIds,
  fireIncidents = [],
  selectedFireId = null,
  onSelectFire,
  placementVariant = "default",
  firefighterZoneView = false,
  fireZoneIds,
  sceneTheme = "day",
}: BuildingSceneCanvasProps) {
  const bounds = useMemo(() => boundsFromZones(zones, assets), [zones, assets]);
  const draftAsset = useMemo((): FacilityAssetRef | null => {
    if (!draftPosition) return null;
    const draftClassName = placementVariant === "fire" ? "화재" : draftClass;
    return { id: "__draft__", class: draftClassName, position: draftPosition };
  }, [draftPosition, draftClass, placementVariant]);

  const showShell = layerVisibility.shell || placementMode;
  const showZoneMeshes = layerVisibility.shell;
  const showFacility = layerVisibility.facility;
  const showStructure = layerVisibility.structure;
  const showFires = layerVisibility.fires ?? true;
  const shellSlabVisible = showZoneMeshes && zones.length > 0;

  const assetMarkerState = useMemo(
    () => ({
      selectedAssetId,
      hoveredAssetId,
      highlightAssetIds,
    }),
    [selectedAssetId, hoveredAssetId, highlightAssetIds],
  );

  const {
    instanced: instancedAssets,
    animated: animatedAssets,
    structural: structuralAssets,
  } = useMemo(
    () => partitionFacilityAssets(assets, assetMarkerState),
    [assets, assetMarkerState],
  );

  const facilityPickAssets = useMemo(
    () => listFacilityPickAssets(assets),
    [assets],
  );
  const facilityPickMeshRef = useRef<THREE.InstancedMesh | null>(null);

  const useMergedZoneShell = showZoneMeshes && !firefighterZoneView;

  const zoneShellStates = useMemo(
    () =>
      zones.map((zone, index) => {
        const zHighlighted =
          zoneSearchHighlightActive && highlightZoneIds.has(zone.id);
        const isFireZone = fireZoneIds?.has(zone.id) ?? false;
        const zDimmed =
          zoneSearchHighlightActive &&
          searchHighlightActive &&
          !zHighlighted &&
          !(firefighterZoneView && isFireZone);
        return {
          zoneId: zone.id,
          index,
          selected: selectedZoneId === zone.id,
          highlighted: zHighlighted,
          dimmed: zDimmed,
          firefighterZoneView,
          isFireZone,
        };
      }),
    [
      zones,
      selectedZoneId,
      zoneSearchHighlightActive,
      highlightZoneIds,
      searchHighlightActive,
      firefighterZoneView,
      fireZoneIds,
    ],
  );

  const staticFireIncidents = useMemo(
    () =>
      fireIncidents.filter(
        (incident) =>
          incident.id !== selectedFireId && incident.id !== "__draft_fire__",
      ),
    [fireIncidents, selectedFireId],
  );

  const selectedFireIncident = useMemo(
    () => fireIncidents.find((incident) => incident.id === selectedFireId) ?? null,
    [fireIncidents, selectedFireId],
  );

  if (!bounds) return null;

  return (
    <>
      <SceneEnvironment bounds={bounds} theme={sceneTheme} />
      <AdaptiveSceneGrid bounds={bounds} shellVisible={shellSlabVisible} />
      <SceneCameraController
        bounds={bounds}
        zones={zones}
        assets={assets}
        command={cameraCommand}
      />
      <PlacementSurface
        bounds={bounds}
        active={placementMode}
        onPick={onPlacementPick}
        variant={placementVariant}
      />
      {showShell ? (
        <group>
          {shellSlabVisible ? (
            <MergedBuildingSlab
              zones={zones}
              xrayShell={shellDisplay.transparent}
              facilityPickAssets={showFacility ? facilityPickAssets : []}
              facilityPickMeshRef={facilityPickMeshRef}
              placementMode={placementMode}
              onSelectZone={(id) => onSelectZone(id)}
              onSelectAsset={showFacility ? onSelectAsset : undefined}
              onPlacementPick={onPlacementPick}
              onContextPick={onContextPick}
            />
          ) : null}
          {shellSlabVisible ? (
            <MergedZoneRim
              zones={zones}
              emergency={sceneTheme === "emergency"}
            />
          ) : null}
          {useMergedZoneShell ? (
            <MergedZoneShell
              zones={zones}
              states={zoneShellStates}
              shellDisplay={shellDisplay}
            />
          ) : null}
          {zones.map((zone, index) => {
            const state = zoneShellStates[index]!;
            return (
              <ZonePanel
                key={zone.id}
                zone={zone}
                index={index}
                selected={state.selected}
                highlighted={state.highlighted}
                dimmed={state.dimmed}
                placementMode={placementMode}
                showMesh={showZoneMeshes}
                showShellFill={!useMergedZoneShell}
                useMergedZoneShell={useMergedZoneShell}
                shellDisplay={shellDisplay}
                firefighterZoneView={firefighterZoneView}
                isFireZone={state.isFireZone}
                onSelect={(id) => onSelectZone(id)}
                onPlacementPick={onPlacementPick}
                onContextPick={onContextPick}
              />
            );
          })}
        </group>
      ) : null}
      {showFacility ? (
        <group>
          <AssetInstancedMarkers
            assets={instancedAssets}
            boundsCenter={bounds.center}
            boundsSize={bounds.size}
            searchHighlightActive={searchHighlightActive}
            highlightAssetIds={highlightAssetIds}
          />
          <SceneAssetPick
            ref={facilityPickMeshRef}
            assets={facilityPickAssets}
            xrayShell={shellDisplay.transparent}
            onSelect={onSelectAsset}
            onContextPick={onContextPick}
          />
          {animatedAssets.map((asset) => {
            const aHighlighted = highlightAssetIds.has(asset.id);
            const aDimmed = searchHighlightActive && !aHighlighted;
            return (
              <AssetSpot
                key={asset.id}
                asset={asset}
                zones={zones}
                unifiedPick
                enlargedPick={shellDisplay.transparent}
                selected={selectedAssetId === asset.id}
                hovered={hoveredAssetId === asset.id}
                highlighted={aHighlighted}
                dimmed={aDimmed}
                onSelect={onSelectAsset}
                onHover={onHoverAsset}
                onContextPick={onContextPick}
              />
            );
          })}
        </group>
      ) : null}
      {showStructure ? (
        <group>
          {structuralAssets.map((asset) => {
            const aHighlighted = highlightAssetIds.has(asset.id);
            const aDimmed = searchHighlightActive && !aHighlighted;
            return (
              <AssetSpot
                key={asset.id}
                asset={asset}
                zones={zones}
                selected={selectedAssetId === asset.id}
                hovered={hoveredAssetId === asset.id}
                highlighted={aHighlighted}
                dimmed={aDimmed}
                onSelect={onSelectAsset}
                onHover={onHoverAsset}
                onContextPick={onContextPick}
              />
            );
          })}
        </group>
      ) : null}
      {draftAsset && placementVariant !== "fire" && (showFacility || placementMode) ? (
        <AssetSpot
          key={draftAsset.id}
          asset={draftAsset}
          zones={zones}
          selected
          hovered
          interactive={false}
          onSelect={() => {}}
          onHover={() => {}}
        />
      ) : null}
      {draftAsset && placementVariant === "fire" && placementMode ? (
        <FireIncidentMarker
          incident={{
            id: "__draft_fire__",
            position: draftAsset.position,
            severity: "high",
            reported_at: new Date().toISOString(),
          }}
          selected
          interactive={false}
          onSelect={() => {}}
        />
      ) : null}
      {showFires ? (
        <group>
          <FireIncidentsInstanced
            incidents={staticFireIncidents}
            interactive={Boolean(onSelectFire)}
            onSelect={(id) => onSelectFire?.(id)}
            onContextPick={onContextPick}
          />
          {selectedFireIncident ? (
            <FireIncidentMarker
              key={selectedFireIncident.id}
              incident={selectedFireIncident}
              selected
              interactive={Boolean(onSelectFire)}
              onSelect={(id) => onSelectFire?.(id)}
              onContextPick={onContextPick}
            />
          ) : null}
        </group>
      ) : null}
    </>
  );
}

export function BuildingSceneCanvas(props: BuildingSceneCanvasProps) {
  const bounds = useMemo(
    () => boundsFromZones(props.zones, props.assets),
    [props.zones, props.assets],
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!bounds || !mounted) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center font-mono text-xs tracking-widest text-zinc-400 uppercase">
        Preparing 3D scene…
      </div>
    );
  }

  return (
    <Canvas
      className="h-full w-full touch-none"
      camera={{ fov: 48, position: [0, 8, 12] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      onPointerMissed={() => {
        if (!props.placementMode) props.onClearSelection();
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
