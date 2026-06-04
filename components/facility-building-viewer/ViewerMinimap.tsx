"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { ZoneNode } from "@/lib/scene-graph-skeleton/types";

type ViewerMinimapProps = {
  zones: ZoneNode[];
  selectedZoneId: string | null;
  highlightZoneIds: ReadonlySet<string>;
  onSelectZone: (zoneId: string) => void;
  onFocusZone: (zoneId: string) => void;
  className?: string;
};

type PlanBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

function planBoundsFromZones(zones: ZoneNode[]): PlanBounds | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const zone of zones) {
    for (const [x, planY] of zone.geometry.coordinates) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, planY);
      maxZ = Math.max(maxZ, planY);
    }
  }

  if (!Number.isFinite(minX)) return null;
  return { minX, maxX, minZ, maxZ };
}

function toSvgPoint(
  x: number,
  z: number,
  bounds: PlanBounds,
  width: number,
  height: number,
  pad: number,
): [number, number] {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1);
  const spanZ = Math.max(bounds.maxZ - bounds.minZ, 1);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const sx = pad + ((x - bounds.minX) / spanX) * innerW;
  const sy = pad + ((z - bounds.minZ) / spanZ) * innerH;
  return [sx, height - sy];
}

export function ViewerMinimap({
  zones,
  selectedZoneId,
  highlightZoneIds,
  onSelectZone,
  onFocusZone,
  className,
}: ViewerMinimapProps) {
  const planBounds = useMemo(() => planBoundsFromZones(zones), [zones]);

  if (!planBounds || zones.length === 0) return null;

  const width = 168;
  const height = 128;
  const pad = 10;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-20 left-3 z-20 overflow-hidden rounded-xl",
        "border border-white/35 bg-white/18 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.45)] backdrop-blur-xl",
        className,
      )}
      aria-label="평면도 미니맵"
      title="구역 클릭 시 이동"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block bg-zinc-950/45"
        aria-hidden
      >
        {zones.map((zone) => {
          const coords = zone.geometry.coordinates;
          if (coords.length < 3) return null;

          const points = coords
            .map(([x, z]) => toSvgPoint(x, z, planBounds, width, height, pad))
            .map(([px, py]) => `${px},${py}`)
            .join(" ");

          const selected = selectedZoneId === zone.id;
          const highlighted = highlightZoneIds.has(zone.id);

          return (
            <polygon
              key={zone.id}
              points={points}
              fill={
                selected
                  ? "rgba(254, 226, 226, 0.55)"
                  : highlighted
                    ? "rgba(253, 230, 138, 0.45)"
                    : "rgba(148, 163, 184, 0.22)"
              }
              stroke={
                selected
                  ? "#fecaca"
                  : highlighted
                    ? "#fde68a"
                    : "rgba(148, 163, 184, 0.55)"
              }
              strokeWidth={selected ? 1.6 : 1}
              className="cursor-pointer transition-colors hover:fill-red-200/40"
              onClick={() => {
                onSelectZone(zone.id);
                onFocusZone(zone.id);
              }}
            >
              <title>{zone.name}</title>
            </polygon>
          );
        })}
      </svg>
    </div>
  );
}
