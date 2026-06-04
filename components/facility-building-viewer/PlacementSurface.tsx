"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { threePointToSkeleton } from "@/lib/scene-graph-skeleton/coordinates";
import type { SceneBounds } from "@/lib/scene-graph-skeleton/bounds";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

type PlacementSurfaceProps = {
  bounds: SceneBounds;
  active: boolean;
  onPick: (position: Vec3) => void;
  /** 화재 지정 모드일 때 바닥 하이라이트 색 */
  variant?: "default" | "fire";
};

export function PlacementSurface({
  bounds,
  active,
  onPick,
  variant = "default",
}: PlacementSurfaceProps) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: variant === "fire" ? 0.14 : 0.08,
        color: variant === "fire" ? "#ef4444" : "#38bdf8",
        depthWrite: false,
      }),
    [variant],
  );

  if (!active) return null;

  const size = Math.max(bounds.size[0], bounds.size[2], 8) * 1.6;
  const y = bounds.min[1] + 0.04;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[bounds.center[0], y, bounds.center[2]]}
      material={material}
      renderOrder={30}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const selfDistance = e.intersections.find((hit) => hit.object === e.object)?.distance;
        if (selfDistance !== undefined) {
          const assetCloser = e.intersections.some(
            (hit) => hit.object !== e.object && hit.distance < selfDistance - 0.02,
          );
          if (assetCloser) return;
        }

        e.stopPropagation();
        const p = e.point;
        onPick(threePointToSkeleton(p.x, p.y, p.z));
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "crosshair";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}
