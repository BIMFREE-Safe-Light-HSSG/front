"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type * as THREE from "three";

import {
  buildMergedFloorGeometry,
  MERGED_FLOOR_MATERIAL,
} from "@/lib/scene-graph-skeleton/zone-floor-merge";
import type { ZoneNode } from "@/lib/scene-graph-skeleton/types";

type MergedBuildingSlabProps = {
  zones: ZoneNode[];
};

export function MergedBuildingSlab({ zones }: MergedBuildingSlabProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => buildMergedFloorGeometry(zones), [zones]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh) mesh.raycast = () => {};
    return () => geometry?.dispose();
  }, [geometry]);

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={MERGED_FLOOR_MATERIAL}
      renderOrder={0}
      receiveShadow
    />
  );
}
