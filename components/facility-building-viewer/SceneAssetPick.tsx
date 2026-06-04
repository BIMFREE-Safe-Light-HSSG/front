"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";

import type { SceneContextTarget } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import {
  getAssetPickMaterial,
  SHARED_ASSET_HIT_SPHERE,
  SHARED_ASSET_HIT_SPHERE_XRAY,
} from "@/lib/scene-graph-skeleton/asset-marker-materials";
import { resolveInstancedAssetFromIntersections } from "@/lib/scene-graph-skeleton/asset-pick";
import { raycastFacilityPickMesh } from "@/lib/scene-graph-skeleton/facility-pick-raycast";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";

const matrixScratch = new THREE.Object3D();

export type SceneAssetPickProps = {
  assets: FacilityAssetRef[];
  /** 반투명 shell — pick 구 확대 */
  xrayShell?: boolean;
  onSelect: (id: string) => void;
  onContextPick?: (target: SceneContextTarget) => void;
};

function resolveAssetFromEvent(
  assets: FacilityAssetRef[],
  pickMesh: THREE.InstancedMesh | null,
  event: ThreeEvent<MouseEvent | PointerEvent>,
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  domElement: HTMLElement,
  xrayShell: boolean,
): FacilityAssetRef | null {
  if (xrayShell) {
    const fromRaycast = raycastFacilityPickMesh(
      raycaster,
      camera,
      domElement,
      event.nativeEvent.clientX,
      event.nativeEvent.clientY,
      pickMesh,
      assets,
    );
    if (fromRaycast) return fromRaycast;
  }

  const fromAll = resolveInstancedAssetFromIntersections(
    assets,
    event.intersections,
  );
  if (fromAll) return fromAll;

  let instanceId = event.instanceId;
  if (instanceId === undefined) {
    for (const hit of event.intersections) {
      if (hit.instanceId !== undefined && hit.object === event.object) {
        instanceId = hit.instanceId;
        break;
      }
    }
  }
  if (instanceId === undefined || instanceId < 0) return null;
  return assets[instanceId] ?? null;
}

export const SceneAssetPick = forwardRef<
  THREE.InstancedMesh | null,
  SceneAssetPickProps
>(function SceneAssetPick(
  { assets, xrayShell = false, onSelect, onContextPick },
  forwardedRef,
) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { raycaster, camera, gl } = useThree();
  const material = useMemo(() => getAssetPickMaterial(), []);
  const hitGeometry = xrayShell
    ? SHARED_ASSET_HIT_SPHERE_XRAY
    : SHARED_ASSET_HIT_SPHERE;

  useImperativeHandle(forwardedRef, () => meshRef.current, [assets.length]);

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
    mesh.computeBoundingSphere();
    mesh.raycast = THREE.InstancedMesh.prototype.raycast;
  }, [assets]);

  const resolveAtEvent = (e: ThreeEvent<MouseEvent | PointerEvent>) =>
    resolveAssetFromEvent(
      assets,
      meshRef.current,
      e,
      raycaster,
      camera,
      gl.domElement,
      xrayShell,
    );

  const pointerHandlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const asset = resolveAtEvent(e);
      if (asset) onSelect(asset.id);
    },
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      const asset = resolveAtEvent(e);
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
      document.body.style.cursor = "pointer";
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = "auto";
    },
  };

  if (assets.length === 0) return null;

  return (
    <instancedMesh
      key={xrayShell ? "pick-xray" : "pick-solid"}
      ref={meshRef}
      args={[hitGeometry, material, Math.max(assets.length, 1)]}
      frustumCulled={false}
      renderOrder={30}
      {...pointerHandlers}
    />
  );
});
