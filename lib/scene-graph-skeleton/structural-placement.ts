import { findZoneForAssetPosition } from "./assets";
import { isStructuralAssetClass } from "./structural-assets";
import { nearestWallProjection } from "./wall-orientation";
import type { FacilityAssetRef, Vec3, ZoneNode } from "./types";

/** skeleton Z-up: 창문 하단(실) = 바닥 + sill */
export const WINDOW_SILL_HEIGHT = 0.9;

/** 평면상 외벽 선분과의 최대 허용 거리(m). 초과 시 문·창 미표시 */
export const STRUCTURAL_WALL_MAX_DISTANCE = 0.55;

/** shell 표면 바깥쪽으로 살짝 밀어 벽체에 겹치지 않게 */
const WALL_SURFACE_OFFSET = 0.05;

function offsetOntoExteriorFace(
  planX: number,
  planY: number,
  zone: ZoneNode,
): [number, number] {
  const [cx, cy] = zone.geometry.center;
  const dx = planX - cx;
  const dy = planY - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return [planX, planY];
  const scale = WALL_SURFACE_OFFSET / len;
  return [planX + dx * scale, planY + dy * scale];
}

export type StructuralPlacement = {
  position: Vec3;
  yaw: number;
};

export function zoneFloorSkeletonZ(zone: ZoneNode): number {
  const { center, height } = zone.geometry;
  return center[2] - height / 2;
}

function structuralKind(assetClass: string): "door" | "window" | null {
  const key = assetClass.trim().toLowerCase();
  if (key === "door") return "door";
  if (key === "window") return "window";
  return null;
}

function resolveZoneForStructural(
  zones: ZoneNode[],
  asset: FacilityAssetRef,
  planX: number,
  planY: number,
  planZ: number,
  wallZone: ZoneNode | null,
): ZoneNode | undefined {
  if (asset.zoneId) {
    const byId = zones.find((z) => z.id === asset.zoneId);
    if (byId) return byId;
  }
  if (wallZone) return wallZone;
  const match = findZoneForAssetPosition(zones, [planX, planY, planZ]);
  if (!match) return undefined;
  return zones.find((z) => z.id === match.zoneId);
}

/**
 * 문·창문을 구역 바닥 높이·외벽 선에 맞춘 skeleton 좌표 (Z-up).
 * 데이터 Z가 구역 중심/천장 쪽이면 바닥으로 보정.
 */
export function resolveStructuralPlacement(
  asset: FacilityAssetRef,
  zones: ZoneNode[],
): StructuralPlacement | null {
  if (!isStructuralAssetClass(asset.class) || zones.length === 0) {
    return null;
  }

  const kind = structuralKind(asset.class);
  if (!kind) return null;

  const [rawX, rawY, rawZ] = asset.position;
  const wall = nearestWallProjection(zones, rawX, rawY, {
    preferZoneId: asset.zoneId,
  });

  if (wall.distance > STRUCTURAL_WALL_MAX_DISTANCE) {
    return null;
  }

  const planX = wall.x;
  const planY = wall.y;

  const zone = resolveZoneForStructural(zones, asset, planX, planY, rawZ, wall.zone);
  if (!zone) {
    return {
      position: [planX, planY, rawZ],
      yaw: wall.yaw,
    };
  }

  const [faceX, faceY] = offsetOntoExteriorFace(planX, planY, zone);
  const floorZ = zoneFloorSkeletonZ(zone);
  const skeletonZ =
    kind === "window" ? floorZ + WINDOW_SILL_HEIGHT : floorZ;

  return {
    position: [faceX, faceY, skeletonZ],
    yaw: wall.yaw,
  };
}
