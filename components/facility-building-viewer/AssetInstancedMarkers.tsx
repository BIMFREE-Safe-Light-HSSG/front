"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  getSharedAssetMarkerMaterial,
  SHARED_ASSET_MARKER_SPHERE,
} from "@/lib/scene-graph-skeleton/asset-marker-materials";
import { groupAssetsByClass, hexToThreeColor } from "@/lib/scene-graph-skeleton/asset-marker-utils";
import { assetClassStyle } from "@/lib/scene-graph-skeleton/assets";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

const matrixScratch = new THREE.Object3D();
const colorScratch = new THREE.Color();
const boundsCenterScratch = new THREE.Vector3();
const LOD_DISTANCE_FACTOR = 1.15;

export type AssetInstancedMarkersProps = {
  assets: FacilityAssetRef[];
  boundsCenter: Vec3;
  boundsSize: Vec3;
  searchHighlightActive: boolean;
  highlightAssetIds: ReadonlySet<string>;
};

function syncSphereInstances(
  mesh: THREE.InstancedMesh,
  assets: FacilityAssetRef[],
  searchHighlightActive: boolean,
  highlightAssetIds: ReadonlySet<string>,
  material: THREE.MeshStandardMaterial,
) {
  if (!mesh.instanceColor || mesh.instanceColor.count !== assets.length) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(assets.length * 3),
      3,
    );
  }

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    const [x, y, z] = skeletonPointToThree(
      asset.position[0],
      asset.position[1],
      asset.position[2],
    );
    const dimmed = searchHighlightActive && !highlightAssetIds.has(asset.id);
    matrixScratch.position.set(x, y, z);
    matrixScratch.scale.setScalar(dimmed ? 0.88 : 1);
    matrixScratch.updateMatrix();
    mesh.setMatrixAt(i, matrixScratch.matrix);

    if (mesh.instanceColor) {
      const highlighted = highlightAssetIds.has(asset.id);
      if (highlighted) {
        colorScratch.set(0xfff4a3);
      } else {
        colorScratch.set(material.color);
        if (dimmed) colorScratch.multiplyScalar(0.22);
      }
      mesh.setColorAt(i, colorScratch);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function ClassMarkerBatch({
  assetClass,
  assets,
  searchHighlightActive,
  highlightAssetIds,
}: {
  assetClass: string;
  assets: FacilityAssetRef[];
  searchHighlightActive: boolean;
  highlightAssetIds: ReadonlySet<string>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () => getSharedAssetMarkerMaterial(assetClass),
    [assetClass],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || assets.length === 0) return;
    syncSphereInstances(
      mesh,
      assets,
      searchHighlightActive,
      highlightAssetIds,
      material,
    );
    mesh.raycast = () => {};
  }, [assets, material, searchHighlightActive, highlightAssetIds]);

  if (assets.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[SHARED_ASSET_MARKER_SPHERE, material, assets.length]}
      frustumCulled
      renderOrder={11}
    />
  );
}

function AssetPointsLod({
  assets,
  searchHighlightActive,
  highlightAssetIds,
}: {
  assets: FacilityAssetRef[];
  searchHighlightActive: boolean;
  highlightAssetIds: ReadonlySet<string>;
}) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(assets.length * 3);
    const colors = new Float32Array(assets.length * 3);

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]!;
      const [x, y, z] = skeletonPointToThree(
        asset.position[0],
        asset.position[1],
        asset.position[2],
      );
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const style = assetClassStyle(asset.class);
      const highlighted = highlightAssetIds.has(asset.id);
      const dimmed = searchHighlightActive && !highlighted;
      if (highlighted) {
        colorScratch.set(0xfff4a3);
      } else {
        colorScratch.set(hexToThreeColor(style.color));
        if (dimmed) colorScratch.multiplyScalar(0.22);
      }
      colors[i * 3] = colorScratch.r;
      colors[i * 3 + 1] = colorScratch.g;
      colors[i * 3 + 2] = colorScratch.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [assets, searchHighlightActive, highlightAssetIds]);

  useLayoutEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  const pointsRef = useRef<THREE.Points>(null);

  useLayoutEffect(() => {
    const points = pointsRef.current;
    if (points) points.raycast = () => {};
  }, [geometry]);

  if (assets.length === 0) return null;

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} renderOrder={11}>
      <pointsMaterial
        size={0.22}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </points>
  );
}

export function AssetInstancedMarkers({
  assets,
  boundsCenter,
  boundsSize,
  searchHighlightActive,
  highlightAssetIds,
}: AssetInstancedMarkersProps) {
  const { camera } = useThree();
  const [usePointsLod, setUsePointsLod] = useState(false);
  const byClass = useMemo(() => groupAssetsByClass(assets), [assets]);

  const lodThreshold = useMemo(() => {
    const span = Math.max(boundsSize[0], boundsSize[1], boundsSize[2], 12);
    return span * LOD_DISTANCE_FACTOR;
  }, [boundsSize]);

  useFrame(() => {
    boundsCenterScratch.set(
      boundsCenter[0],
      boundsCenter[1],
      boundsCenter[2],
    );
    const dist = camera.position.distanceTo(boundsCenterScratch);
    const next = dist > lodThreshold;
    setUsePointsLod((prev) => (prev === next ? prev : next));
  });

  if (assets.length === 0) return null;

  return (
    <group>
      {usePointsLod ? (
        <AssetPointsLod
          assets={assets}
          searchHighlightActive={searchHighlightActive}
          highlightAssetIds={highlightAssetIds}
        />
      ) : (
        [...byClass.entries()].map(([assetClass, classAssets]) => (
          <ClassMarkerBatch
            key={assetClass}
            assetClass={assetClass}
            assets={classAssets}
            searchHighlightActive={searchHighlightActive}
            highlightAssetIds={highlightAssetIds}
          />
        ))
      )}
    </group>
  );
}
