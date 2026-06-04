"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { ViewerShellDisplay } from "@/components/facility-building-viewer/scene-camera-types";
import {
  buildMergedZoneShellGeometry,
  createMergedZoneShellMaterial,
  type ZoneShellVisualState,
} from "@/lib/scene-graph-skeleton/zone-merge";
import type { ZoneNode } from "@/lib/scene-graph-skeleton/types";

export type MergedZoneShellProps = {
  zones: ZoneNode[];
  states: ZoneShellVisualState[];
  shellDisplay: ViewerShellDisplay;
};

/** 구역 extrude shell — 시각만, raycast/클릭 없음 (시설 pick 방해 방지) */
export function MergedZoneShell({
  zones,
  states,
  shellDisplay,
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
    () =>
      createMergedZoneShellMaterial(
        shellDisplay.transparent,
        shellDisplay.openRoof,
      ),
    [shellDisplay.transparent, shellDisplay.openRoof],
  );

  const materialOwned =
    shellDisplay.transparent || shellDisplay.openRoof;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh) mesh.raycast = () => {};
    return () => {
      geometry?.dispose();
      if (materialOwned) material.dispose();
    };
  }, [geometry, material, materialOwned]);

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={shellDisplay.openRoof ? 3 : 1}
    />
  );
}
