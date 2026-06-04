"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBounds } from "@/lib/scene-graph-skeleton/bounds";

type AdaptiveSceneGridProps = {
  bounds: SceneBounds;
  /** shell 레이어가 켜져 있으면 그리드 숨김 */
  shellVisible: boolean;
};

export function AdaptiveSceneGrid({
  bounds,
  shellVisible,
}: AdaptiveSceneGridProps) {
  const gridRef = useRef<THREE.GridHelper>(null);
  const { camera } = useThree();
  const target = useMemo(
    () =>
      new THREE.Vector3(bounds.center[0], bounds.center[1], bounds.center[2]),
    [bounds.center],
  );

  const size = Math.max(bounds.size[0], bounds.size[2]) * 1.4;
  const position = useMemo(
    (): [number, number, number] => [
      bounds.center[0],
      bounds.min[1] - 0.05,
      bounds.center[2],
    ],
    [bounds.center, bounds.min],
  );

  useFrame(() => {
    const grid = gridRef.current;
    if (!grid) return;

    if (shellVisible) {
      grid.visible = false;
      return;
    }

    const dist = camera.position.distanceTo(target);
    const maxDim = Math.max(bounds.size[0], bounds.size[2], 1);
    const fadeStart = maxDim * 0.55;
    const fadeEnd = maxDim * 2.4;
    const t = THREE.MathUtils.clamp(
      (dist - fadeStart) / (fadeEnd - fadeStart),
      0,
      1,
    );
    const opacity = (1 - t) * 0.55;

    grid.visible = opacity > 0.03;
    const materials = Array.isArray(grid.material)
      ? grid.material
      : [grid.material];
    for (const mat of materials) {
      if (mat instanceof THREE.Material) {
        mat.transparent = true;
        mat.opacity = opacity;
      }
    }
  });

  return (
    <gridHelper
      ref={gridRef}
      args={[size, 24, "#1e3a5f", "#132238"]}
      position={position}
    />
  );
}
