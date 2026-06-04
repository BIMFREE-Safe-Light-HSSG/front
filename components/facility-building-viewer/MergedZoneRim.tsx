"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  buildMergedZoneRimGeometry,
  ZONE_RIM_LINE_MATERIAL,
} from "@/lib/scene-graph-skeleton/zone-shell-rim";
import type { ZoneNode } from "@/lib/scene-graph-skeleton/types";

type MergedZoneRimProps = {
  zones: ZoneNode[];
  emergency?: boolean;
};

export function MergedZoneRim({ zones, emergency = false }: MergedZoneRimProps) {
  const lineRef = useRef<THREE.Line>(null);
  const geometry = useMemo(() => buildMergedZoneRimGeometry(zones), [zones]);

  const material = useMemo(() => {
    if (!emergency) return ZONE_RIM_LINE_MATERIAL;
    return new THREE.LineBasicMaterial({
      color: 0xfca5a5,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
  }, [emergency]);

  useLayoutEffect(() => {
    const line = lineRef.current;
    if (line) line.raycast = () => {};
    return () => {
      geometry?.dispose();
      if (emergency) material.dispose();
    };
  }, [geometry, material, emergency]);

  if (!geometry) return null;

  return (
    <line
      ref={lineRef}
      geometry={geometry}
      material={material}
      renderOrder={4}
    />
  );
}
