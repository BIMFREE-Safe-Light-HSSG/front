"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, type RefObject } from "react";
import type { InstancedMesh } from "three";
import * as THREE from "three";

import type { SceneContextTarget } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import { findZoneForAssetPosition } from "@/lib/scene-graph-skeleton/assets";
import { raycastFacilityPickMesh } from "@/lib/scene-graph-skeleton/facility-pick-raycast";
import { threePointToSkeleton } from "@/lib/scene-graph-skeleton/coordinates";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";
import {
  buildMergedFloorGeometry,
  MERGED_FLOOR_MATERIAL,
} from "@/lib/scene-graph-skeleton/zone-floor-merge";
import { createZoneOutlineGeometry } from "@/lib/scene-graph-skeleton/zone-geometry";
import type { Vec3, ZoneNode } from "@/lib/scene-graph-skeleton/types";

type MergedBuildingSlabProps = {
  zones: ZoneNode[];
  /** 천장 OFF — 바닥 경계선으로 벽·구역 대비 */
  openRoof?: boolean;
  /** 반투명 shell일 때만 slab에서 시설 pick raycast */
  xrayShell?: boolean;
  facilityPickAssets?: FacilityAssetRef[];
  facilityPickMeshRef?: RefObject<InstancedMesh | null>;
  placementMode?: boolean;
  onSelectZone?: (zoneId: string) => void;
  onSelectAsset?: (assetId: string) => void;
  onPlacementPick?: (position: Vec3) => void;
  onContextPick?: (target: SceneContextTarget) => void;
};

/** shell 대신 바닥에서 구역 클릭·우클릭 (shell은 pick 없음) */
const FLOOR_EDGE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x64748b,
  transparent: true,
  opacity: 0.85,
  depthTest: true,
});

export function MergedBuildingSlab({
  zones,
  openRoof = false,
  xrayShell = false,
  facilityPickAssets = [],
  facilityPickMeshRef,
  placementMode = false,
  onSelectZone,
  onSelectAsset,
  onPlacementPick,
  onContextPick,
}: MergedBuildingSlabProps) {
  const { raycaster, camera, gl } = useThree();
  const geometry = useMemo(() => buildMergedFloorGeometry(zones), [zones]);

  useLayoutEffect(() => {
    return () => geometry?.dispose();
  }, [geometry]);

  const pickAssetFromEvent = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
    if (!xrayShell || facilityPickAssets.length === 0) return null;
    return raycastFacilityPickMesh(
      raycaster,
      camera,
      gl.domElement,
      e.nativeEvent.clientX,
      e.nativeEvent.clientY,
      facilityPickMeshRef?.current,
      facilityPickAssets,
    );
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const asset = pickAssetFromEvent(e);
    if (asset) {
      e.stopPropagation();
      onSelectAsset?.(asset.id);
      return;
    }

    e.stopPropagation();
    const position = threePointToSkeleton(e.point.x, e.point.y, e.point.z);

    if (placementMode) {
      onPlacementPick?.(position);
      return;
    }

    const zone = findZoneForAssetPosition(zones, position);
    if (zone) onSelectZone?.(zone.zoneId);
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    if (placementMode || !onContextPick) return;

    const asset = pickAssetFromEvent(e);
    if (asset) {
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      onContextPick({
        position: asset.position,
        clientX: e.nativeEvent.clientX,
        clientY: e.nativeEvent.clientY,
        zoneId: asset.zoneId,
        zoneName: asset.zoneName,
        assetId: asset.id,
        assetClass: asset.class,
      });
      return;
    }

    e.stopPropagation();
    e.nativeEvent.preventDefault();

    const position = threePointToSkeleton(e.point.x, e.point.y, e.point.z);
    const zone = findZoneForAssetPosition(zones, position);

    onContextPick({
      position,
      clientX: e.nativeEvent.clientX,
      clientY: e.nativeEvent.clientY,
      zoneId: zone?.zoneId,
      zoneName: zone?.zoneName,
    });
  };

  if (!geometry) return null;

  return (
    <group>
      <mesh
        geometry={geometry}
        material={MERGED_FLOOR_MATERIAL}
        renderOrder={2}
        receiveShadow
        onClick={handleClick}
        onContextMenu={onContextPick ? handleContextMenu : undefined}
        onPointerOver={(e) => {
          if (placementMode) return;
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (!placementMode) document.body.style.cursor = "auto";
        }}
      />
      {openRoof
        ? zones.map((zone) => {
            const outline = createZoneOutlineGeometry(zone);
            if (!outline) return null;
            return (
              <line
                key={`floor-edge-${zone.id}`}
                geometry={outline}
                material={FLOOR_EDGE_MATERIAL}
                renderOrder={3}
                raycast={() => {}}
              />
            );
          })
        : null}
    </group>
  );
}
