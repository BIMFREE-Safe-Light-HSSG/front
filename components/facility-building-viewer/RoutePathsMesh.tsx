"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import type { RoutePath } from "@/lib/scene-graph-skeleton/route-assets";

const ROUTE_LINE_WIDTH = 0.48;

const ROUTE_LINE_MATERIAL = new LineMaterial({
  color: 0x06b6d4,
  linewidth: ROUTE_LINE_WIDTH,
  worldUnits: true,
  transparent: true,
  opacity: 1,
  depthTest: true,
});

const ROUTE_LINE_DIMMED = new LineMaterial({
  color: 0x06b6d4,
  linewidth: ROUTE_LINE_WIDTH * 0.85,
  worldUnits: true,
  transparent: true,
  opacity: 0.35,
  depthTest: true,
});

const ROUTE_MATERIALS = [ROUTE_LINE_MATERIAL, ROUTE_LINE_DIMMED];

type RoutePathsMeshProps = {
  paths: RoutePath[];
  dimmed?: boolean;
};

function RoutePathLine({ path, dimmed = false }: { path: RoutePath; dimmed?: boolean }) {
  const material = dimmed ? ROUTE_LINE_DIMMED : ROUTE_LINE_MATERIAL;

  const line = useMemo(() => {
    const positions: number[] = [];
    for (const [x, y, z] of path.points) {
      const [tx, ty, tz] = skeletonPointToThree(x, y, z);
      positions.push(tx, ty, tz);
    }
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    const routeLine = new Line2(geometry, material);
    routeLine.computeLineDistances();
    routeLine.raycast = () => {};
    return routeLine;
  }, [path.points, material]);

  useEffect(() => {
    return () => {
      line.geometry.dispose();
    };
  }, [line]);

  return <primitive object={line} renderOrder={6} />;
}

export function RoutePathsMesh({ paths, dimmed = false }: RoutePathsMeshProps) {
  const { size } = useThree();

  useLayoutEffect(() => {
    for (const material of ROUTE_MATERIALS) {
      material.resolution.set(size.width, size.height);
    }
  }, [size]);

  if (paths.length === 0) return null;

  return (
    <group>
      {paths.map((path) => (
        <RoutePathLine key={path.id} path={path} dimmed={dimmed} />
      ))}
    </group>
  );
}
