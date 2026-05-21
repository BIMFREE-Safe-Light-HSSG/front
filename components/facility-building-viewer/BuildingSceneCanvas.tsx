"use client";

import {
  Canvas,
  useFrame,
  type ThreeEvent,
} from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { AssetSpot } from "@/components/facility-building-viewer/AssetSpot";
import { FireIncidentMarker } from "@/components/facility-building-viewer/FireIncidentMarker";
import { PlacementSurface } from "@/components/facility-building-viewer/PlacementSurface";
import { SceneCameraController } from "@/components/facility-building-viewer/SceneCameraController";
import type {
  CameraCommand,
  ViewerLayerVisibility,
} from "@/components/facility-building-viewer/scene-camera-types";
import { boundsFromZones } from "@/lib/scene-graph-skeleton/bounds";
import { threePointToSkeleton } from "@/lib/scene-graph-skeleton/coordinates";
import {
  createGlassZoneMaterial,
  createZoneExtrudeGeometry,
  createZoneFloorPickGeometry,
  createZoneOutlineGeometry,
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
  cameraCommand: CameraCommand | null;
  onSelectZone: (id: string | null) => void;
  onSelectAsset: (id: string) => void;
  onHoverAsset: (id: string | null) => void;
  onClearSelection: () => void;
  onPlacementPick: (position: Vec3) => void;
  searchHighlightActive: boolean;
  highlightZoneIds: ReadonlySet<string>;
  highlightAssetIds: ReadonlySet<string>;
  fireIncidents?: FireIncident[];
  selectedFireId?: string | null;
  onSelectFire?: (id: string) => void;
  placementVariant?: "default" | "fire";
};

function disableRaycast(mesh: THREE.Mesh | null) {
  if (mesh) mesh.raycast = () => {};
}

function ZonePanel({
  zone,
  index,
  selected,
  highlighted,
  dimmed,
  placementMode,
  showMesh,
  onSelect,
  onPlacementPick,
}: {
  zone: ZoneNode;
  index: number;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  placementMode: boolean;
  showMesh: boolean;
  onSelect: (id: string) => void;
  onPlacementPick: (position: Vec3) => void;
}) {
  const fillRef = useRef<THREE.Mesh>(null);
  const color = zoneAccentColor(index);
  const geometry = useMemo(() => createZoneExtrudeGeometry(zone), [zone]);
  const floorPick = useMemo(() => createZoneFloorPickGeometry(zone), [zone]);
  const outline = useMemo(() => createZoneOutlineGeometry(zone), [zone]);
  const glowOutline = useMemo(
    () => (selected && outline ? outline.clone() : null),
    [selected, outline],
  );

  const material = useMemo(() => {
    if (highlighted) {
      return createGlassZoneMaterial(color, {
        opacity: 0.58,
        color: 0xfff4a3,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.35,
      });
    }
    if (dimmed) {
      return createGlassZoneMaterial(color, { opacity: 0.07 });
    }
    return createGlassZoneMaterial(selected ? 0xffffff : color);
  }, [color, selected, highlighted, dimmed]);

  const outlineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: highlighted ? 0xfde68a : selected ? 0xffffff : color,
        transparent: true,
        opacity: highlighted ? 1 : dimmed ? 0.2 : selected ? 0.95 : 0.55,
      }),
    [color, selected, highlighted, dimmed],
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: highlighted ? 0xfbbf24 : color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    [color, highlighted],
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
      {showMesh && geometry ? (
        <mesh
          ref={fillRef}
          geometry={geometry}
          material={material}
          position={transform.position}
          rotation={transform.rotation}
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
          geometry={floorPick}
          material={floorPickMaterial}
          position={transform.position}
          rotation={transform.rotation}
          renderOrder={0}
          {...pickHandlers}
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
  cameraCommand,
  onSelectZone,
  onSelectAsset,
  onHoverAsset,
  onPlacementPick,
  searchHighlightActive,
  highlightZoneIds,
  highlightAssetIds,
  fireIncidents = [],
  selectedFireId = null,
  onSelectFire,
  placementVariant = "default",
}: BuildingSceneCanvasProps) {
  const bounds = useMemo(() => boundsFromZones(zones, assets), [zones, assets]);
  const draftAsset = useMemo((): FacilityAssetRef | null => {
    if (!draftPosition) return null;
    const draftClassName = placementVariant === "fire" ? "화재" : draftClass;
    return { id: "__draft__", class: draftClassName, position: draftPosition };
  }, [draftPosition, draftClass, placementVariant]);

  const showZones = layerVisibility.zones || placementMode;
  const showZoneMeshes = layerVisibility.zones;
  const showAssets = layerVisibility.assets;
  const showFires = layerVisibility.fires ?? true;

  if (!bounds) return null;

  return (
    <>
      <color attach="background" args={["#0c1220"]} />
      <fog
        attach="fog"
        args={["#0c1220", bounds.size[0] * 2, bounds.size[0] * 8]}
      />
      <ambientLight intensity={0.55} />
      <directionalLight position={[12, 18, 8]} intensity={1.1} />
      <directionalLight
        position={[-8, 10, -6]}
        intensity={0.35}
        color="#93c5fd"
      />
      <gridHelper
        args={[
          Math.max(bounds.size[0], bounds.size[2]) * 1.4,
          24,
          "#1e3a5f",
          "#132238",
        ]}
        position={[bounds.center[0], bounds.min[1] - 0.05, bounds.center[2]]}
      />
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
      {showZones ? (
        <group>
          {zones.map((zone, index) => {
            const zHighlighted = highlightZoneIds.has(zone.id);
            const zDimmed = searchHighlightActive && !zHighlighted;
            return (
              <ZonePanel
                key={zone.id}
                zone={zone}
                index={index}
                selected={selectedZoneId === zone.id}
                highlighted={zHighlighted}
                dimmed={zDimmed}
                placementMode={placementMode}
                showMesh={showZoneMeshes}
                onSelect={(id) => onSelectZone(id)}
                onPlacementPick={onPlacementPick}
              />
            );
          })}
        </group>
      ) : null}
      {showAssets ? (
        <group>
          {assets.map((asset) => {
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
              />
            );
          })}
        </group>
      ) : null}
      {draftAsset && placementVariant !== "fire" && (showAssets || placementMode) ? (
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
          {fireIncidents.map((incident) => (
            <FireIncidentMarker
              key={incident.id}
              incident={incident}
              selected={selectedFireId === incident.id}
              interactive={Boolean(onSelectFire)}
              onSelect={(id) => onSelectFire?.(id)}
            />
          ))}
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
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      onPointerMissed={() => {
        if (!props.placementMode) props.onClearSelection();
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
