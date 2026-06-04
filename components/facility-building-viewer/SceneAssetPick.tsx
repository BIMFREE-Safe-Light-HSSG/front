"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneContextTarget } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import {
  getAssetPickMaterial,
  SHARED_ASSET_HIT_SPHERE,
} from "@/lib/scene-graph-skeleton/asset-marker-materials";
import { resolveInstancedAssetFromIntersections } from "@/lib/scene-graph-skeleton/asset-pick";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";

const matrixScratch = new THREE.Object3D();

export type SceneAssetPickProps = {
  assets: FacilityAssetRef[];
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onContextPick?: (target: SceneContextTarget) => void;
};

function resolveAsset(
  assets: FacilityAssetRef[],
  event: ThreeEvent<MouseEvent | PointerEvent>,
): FacilityAssetRef | null {
  const fromAll = resolveInstancedAssetFromIntersections(
    assets,
    event.intersections,
  );
  if (fromAll) return fromAll;

  let instanceId = event.instanceId;
  if (instanceId === undefined) {
    for (const hit of event.intersections) {
      if (
        hit.instanceId !== undefined &&
        hit.object === event.object
      ) {
        instanceId = hit.instanceId;
        break;
      }
    }
  }
  if (instanceId === undefined || instanceId < 0) return null;
  return assets[instanceId] ?? null;
}

export function SceneAssetPick({
  assets,
  onSelect,
  onHover,
  onContextPick,
}: SceneAssetPickProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => getAssetPickMaterial(), []);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || assets.length === 0) return;

    mesh.userData.assetPick = true;
    mesh.count = assets.length;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]!;
      const [x, y, z] = skeletonPointToThree(
        asset.position[0],
        asset.position[1],
        asset.position[2],
      );
      matrixScratch.position.set(x, y, z);
      matrixScratch.scale.setScalar(1);
      matrixScratch.updateMatrix();
      mesh.setMatrixAt(i, matrixScratch.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [assets]);

  const pointerHandlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const asset = resolveAsset(assets, e);
      if (asset) onSelect(asset.id);
    },
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      const asset = resolveAsset(assets, e);
      if (!asset || !onContextPick) return;
      onContextPick({
        position: asset.position,
        clientX: e.nativeEvent.clientX,
        clientY: e.nativeEvent.clientY,
        zoneId: asset.zoneId,
        zoneName: asset.zoneName,
        assetId: asset.id,
        assetClass: asset.class,
      });
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const asset = resolveAsset(assets, e);
      if (asset) {
        onHover(asset.id);
        document.body.style.cursor = "pointer";
      }
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(null);
      document.body.style.cursor = "auto";
    },
  };

  if (assets.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[SHARED_ASSET_HIT_SPHERE, material, assets.length]}
      frustumCulled={false}
      renderOrder={25}
      {...pointerHandlers}
    />
  );
}
