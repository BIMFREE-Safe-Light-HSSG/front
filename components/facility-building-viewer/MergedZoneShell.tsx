"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { ViewerShellDisplay } from "@/components/facility-building-viewer/scene-camera-types";
import { findZoneForAssetPosition } from "@/lib/scene-graph-skeleton/assets";
import {
  closestAssetPickDistance,
  resolveInstancedAssetFromIntersections,
  resolveSpotAssetIdFromIntersections,
} from "@/lib/scene-graph-skeleton/asset-pick";
import { threePointToSkeleton } from "@/lib/scene-graph-skeleton/coordinates";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";
import {
  buildMergedZoneShellGeometry,
  createMergedZoneShellMaterial,
  type ZoneShellVisualState,
} from "@/lib/scene-graph-skeleton/zone-merge";
import type { Vec3, ZoneNode } from "@/lib/scene-graph-skeleton/types";

export type MergedZoneShellProps = {
  zones: ZoneNode[];
  states: ZoneShellVisualState[];
  shellDisplay: ViewerShellDisplay;
  pickAssets: FacilityAssetRef[];
  placementMode: boolean;
  onSelectZone: (id: string) => void;
  onSelectAsset: (id: string) => void;
  onPlacementPick: (position: Vec3) => void;
};

export function MergedZoneShell({
  zones,
  states,
  shellDisplay,
  placementMode,
  onSelectZone,
  onPlacementPick,
}: MergedZoneShellProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(
    () =>
      buildMergedZoneShellGeometry(zones, states, {
        openRoof: shellDisplay.openRoof,
      }),
    [zones, states, shellDisplay.openRoof],
  );

  const material = useMemo(
    () => createMergedZoneShellMaterial(shellDisplay.transparent),
    [shellDisplay.transparent],
  );

  useLayoutEffect(() => {
    return () => {
      geometry?.dispose();
      if (shellDisplay.transparent) material.dispose();
    };
  }, [geometry, material, shellDisplay.transparent]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const shellDistance =
      e.intersections.find((hit) => hit.object === meshRef.current)?.distance ??
      e.distance;
    const assetPickDistance = closestAssetPickDistance(e.intersections);

    if (
      assetPickDistance !== null &&
      assetPickDistance < shellDistance - 0.02
    ) {
      const spotId = resolveSpotAssetIdFromIntersections(e.intersections);
      if (spotId) {
        onSelectAsset(spotId);
        e.stopPropagation();
        return;
      }
      const instanced = resolveInstancedAssetFromIntersections(
        pickAssets,
        e.intersections,
      );
      if (instanced) {
        onSelectAsset(instanced.id);
        e.stopPropagation();
        return;
      }
    }

    e.stopPropagation();
    const position = threePointToSkeleton(e.point.x, e.point.y, e.point.z);

    if (placementMode) {
      onPlacementPick(position);
      return;
    }

    const zone = findZoneForAssetPosition(zones, position);
    if (zone) onSelectZone(zone.zoneId);
  };

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={1}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!placementMode) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (!placementMode) document.body.style.cursor = "auto";
      }}
    />
  );
}
