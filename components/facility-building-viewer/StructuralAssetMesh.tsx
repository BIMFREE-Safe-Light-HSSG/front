"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { isStructuralAssetClass } from "@/lib/scene-graph-skeleton/structural-assets";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import { resolveStructuralPlacement } from "@/lib/scene-graph-skeleton/structural-placement";
import type { SceneContextTarget } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import type { FacilityAssetRef, ZoneNode } from "@/lib/scene-graph-skeleton/types";

const DOOR_WIDTH = 0.92;
const DOOR_HEIGHT = 2.1;
const DOOR_DEPTH = 0.14;
const DOOR_FRAME = 0.08;
/** 기본: 건물 shell과 비슷한 톤. 반투명(xray)에서만 DoorMesh가 강조 팔레트 사용 */
const DOOR_COLORS = {
  frame: "#64748b",
  panel: "#94a3b8",
  frameEmissive: "#1e293b",
  panelEmissive: "#334155",
  outline: "#475569",
  frameActive: "#fbbf24",
  panelActive: "#fff7d6",
  frameEmissiveActive: "#b45309",
  panelEmissiveActive: "#d97706",
  outlineActive: "#fef3c7",
  handle: "#cbd5e1",
  handleActive: "#fffbeb",
} as const;

const WINDOW_WIDTH = 1.35;
const WINDOW_HEIGHT = 1.05;
const WINDOW_FRAME = 0.08;
const WINDOW_DEPTH = 0.12;

function useBoxOutline(width: number, height: number, depth: number) {
  return useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [width, height, depth]);
}

function BoxOutline({
  width,
  height,
  depth,
  color,
  opacity = 0.92,
  position = [0, 0, 0] as [number, number, number],
  renderOrder = 2,
  depthTest = true,
}: {
  width: number;
  height: number;
  depth: number;
  color: string;
  opacity?: number;
  position?: [number, number, number];
  renderOrder?: number;
  depthTest?: boolean;
}) {
  const geometry = useBoxOutline(width, height, depth);
  return (
    <lineSegments geometry={geometry} position={position} renderOrder={renderOrder}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthTest={depthTest}
        depthWrite={depthTest}
      />
    </lineSegments>
  );
}

export type StructuralAssetMeshProps = {
  asset: FacilityAssetRef;
  zones: ZoneNode[];
  selected: boolean;
  hovered: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  interactive?: boolean;
  /** 반투명 shell일 때 문 시각 강조 */
  xrayShell?: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onContextPick?: (target: SceneContextTarget) => void;
};

function structuralKind(assetClass: string): "door" | "window" | null {
  const key = assetClass.trim().toLowerCase();
  if (key === "door") return "door";
  if (key === "window") return "window";
  return null;
}

function DoorMesh({
  active,
  dimmed,
  xrayEmphasized = false,
}: {
  active: boolean;
  dimmed: boolean;
  xrayEmphasized?: boolean;
}) {
  const dim = dimmed ? 0.4 : 1;
  const emphasize = xrayEmphasized && !active;
  const frameColor = active
    ? DOOR_COLORS.frameActive
    : emphasize
      ? "#fbbf24"
      : DOOR_COLORS.frame;
  const panelColor = active
    ? DOOR_COLORS.panelActive
    : emphasize
      ? "#fde68a"
      : DOOR_COLORS.panel;
  const frameEmissive = active
    ? DOOR_COLORS.frameEmissiveActive
    : emphasize
      ? "#f59e0b"
      : DOOR_COLORS.frameEmissive;
  const panelEmissive = active
    ? DOOR_COLORS.panelEmissiveActive
    : emphasize
      ? "#d97706"
      : DOOR_COLORS.panelEmissive;
  const outlineColor = active
    ? DOOR_COLORS.outlineActive
    : emphasize
      ? "#f59e0b"
      : DOOR_COLORS.outline;
  const glowColor = active ? "#fcd34d" : emphasize ? "#fbbf24" : DOOR_COLORS.outline;
  const showGlow = active || emphasize;

  const meshRenderOrder = emphasize ? 12 : 2;

  return (
    <group
      position={[0, DOOR_HEIGHT / 2, 0]}
      renderOrder={meshRenderOrder}
      scale={emphasize ? [1.06, 1.04, 1.06] : [1, 1, 1]}
    >
      {showGlow ? (
        <mesh position={[0, 0, -DOOR_DEPTH * 0.35]} renderOrder={meshRenderOrder}>
          <planeGeometry args={[DOOR_WIDTH + 0.18, DOOR_HEIGHT + 0.12]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={(active ? 0.28 : 0.42) * dim}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      <mesh castShadow receiveShadow renderOrder={meshRenderOrder}>
        <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH]} />
        <meshStandardMaterial
          color={frameColor}
          emissive={frameEmissive}
          emissiveIntensity={(active ? 0.55 : emphasize ? 0.72 : 0.08) * dim}
          metalness={0.15}
          roughness={0.45}
          transparent={dimmed}
          opacity={dim}
        />
      </mesh>
      <mesh position={[0, 0, DOOR_DEPTH * 0.42]} castShadow renderOrder={meshRenderOrder}>
        <boxGeometry
          args={[DOOR_WIDTH - DOOR_FRAME * 2, DOOR_HEIGHT - DOOR_FRAME * 2, DOOR_DEPTH * 0.5]}
        />
        <meshStandardMaterial
          color={panelColor}
          emissive={panelEmissive}
          emissiveIntensity={(active ? 0.48 : emphasize ? 0.58 : 0.06) * dim}
          metalness={0.08}
          roughness={0.38}
          transparent={dimmed}
          opacity={dim}
        />
      </mesh>
      <BoxOutline
        width={DOOR_WIDTH + 0.02}
        height={DOOR_HEIGHT + 0.02}
        depth={DOOR_DEPTH + 0.04}
        color={outlineColor}
        opacity={(active ? 1 : emphasize ? 1 : 0.42) * dim}
        position={[0, 0, DOOR_DEPTH * 0.5]}
        depthTest={!emphasize}
        renderOrder={meshRenderOrder}
      />
      <mesh position={[0, -DOOR_HEIGHT * 0.5 + 0.04, DOOR_DEPTH * 0.48]} renderOrder={meshRenderOrder}>
        <boxGeometry args={[DOOR_WIDTH + 0.06, 0.06, DOOR_DEPTH * 0.35]} />
        <meshStandardMaterial
          color={active ? "#fbbf24" : emphasize ? "#94a3b8" : "#64748b"}
          emissive={active ? "#b45309" : emphasize ? "#475569" : "#1e293b"}
          emissiveIntensity={(active ? 0.35 : emphasize ? 0.22 : 0.06) * dim}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <mesh
        position={[DOOR_WIDTH * 0.32, -DOOR_HEIGHT * 0.05, DOOR_DEPTH * 0.58]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.03, 0.03, 0.14, 10]} />
        <meshStandardMaterial
          color={active ? DOOR_COLORS.handleActive : DOOR_COLORS.handle}
          emissive={active ? "#fbbf24" : "#cbd5e1"}
          emissiveIntensity={active ? 0.45 : emphasize ? 0.28 : 0.1}
          metalness={0.7}
          roughness={0.22}
        />
      </mesh>
      {active ? (
        <mesh position={[0, DOOR_HEIGHT * 0.42, DOOR_DEPTH * 0.72]} renderOrder={meshRenderOrder + 1}>
          <boxGeometry args={[0.05, 0.05, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.7} />
        </mesh>
      ) : null}
    </group>
  );
}

function WindowMesh({
  active,
  dimmed,
  xrayEmphasized = false,
}: {
  active: boolean;
  dimmed: boolean;
  xrayEmphasized?: boolean;
}) {
  const dim = dimmed ? 0.4 : 1;
  const emphasize = xrayEmphasized && !active;
  const frameColor = active ? "#f8fafc" : emphasize ? "#e0f2fe" : "#64748b";
  const frameEmissive = active ? "#0ea5e9" : emphasize ? "#38bdf8" : "#1e293b";
  const outlineColor = active ? "#fef9c3" : emphasize ? "#7dd3fc" : "#475569";
  const glowColor = active ? "#7dd3fc" : emphasize ? "#38bdf8" : "#64748b";
  const showGlow = active || emphasize;

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: frameColor,
        emissive: frameEmissive,
        emissiveIntensity: (active ? 0.35 : emphasize ? 0.45 : 0.06) * dim,
        metalness: 0.4,
        roughness: 0.3,
        transparent: dimmed,
        opacity: dim,
      }),
    [active, dimmed, dim, frameColor, frameEmissive, emphasize],
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: active ? "#e0f2fe" : emphasize ? "#bae6fd" : "#94a3b8",
        emissive: active ? "#38bdf8" : emphasize ? "#0ea5e9" : "#334155",
        emissiveIntensity: (active ? 0.35 : emphasize ? 0.38 : 0.04) * dim,
        metalness: 0,
        roughness: emphasize ? 0.02 : 0.12,
        transmission: emphasize || active ? 0.55 : 0,
        thickness: 0.2,
        ior: 1.45,
        transparent: dimmed || emphasize || active,
        opacity: dimmed ? 0.35 : emphasize || active ? 0.95 : 0.88,
        side: THREE.FrontSide,
        depthWrite: !dimmed && !emphasize && !active,
      }),
    [active, dimmed, dim, emphasize],
  );

  const mullionMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: active ? "#e2e8f0" : emphasize ? "#94a3b8" : "#64748b",
        emissive: active ? "#0284c7" : emphasize ? "#475569" : "#1e293b",
        emissiveIntensity: (active ? 0.22 : emphasize ? 0.2 : 0.05) * dim,
        metalness: 0.55,
        roughness: 0.35,
      }),
    [active, emphasize, dim],
  );

  const innerW = WINDOW_WIDTH - WINDOW_FRAME * 2;
  const innerH = WINDOW_HEIGHT - WINDOW_FRAME * 2;
  const meshRenderOrder = emphasize ? 12 : 2;

  return (
    <group
      position={[0, WINDOW_HEIGHT / 2, 0]}
      renderOrder={meshRenderOrder}
      scale={emphasize ? [1.04, 1.03, 1.04] : [1, 1, 1]}
    >
      {showGlow ? (
        <mesh position={[0, 0, -WINDOW_DEPTH * 0.3]} renderOrder={meshRenderOrder}>
          <planeGeometry args={[WINDOW_WIDTH + 0.2, WINDOW_HEIGHT + 0.16]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={(active ? 0.32 : 0.36) * dim}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      <mesh material={frameMat} castShadow renderOrder={meshRenderOrder}>
        <boxGeometry args={[WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_DEPTH]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.28]} material={glassMat} renderOrder={meshRenderOrder}>
        <boxGeometry args={[innerW, innerH, 0.03]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.38]} material={mullionMat} renderOrder={meshRenderOrder}>
        <boxGeometry args={[WINDOW_FRAME, innerH, 0.04]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.38]} material={mullionMat} renderOrder={meshRenderOrder}>
        <boxGeometry args={[innerW, WINDOW_FRAME, 0.04]} />
      </mesh>
      <BoxOutline
        width={WINDOW_WIDTH + 0.02}
        height={WINDOW_HEIGHT + 0.02}
        depth={WINDOW_DEPTH + 0.04}
        color={outlineColor}
        opacity={(active ? 1 : emphasize ? 0.95 : 0.4) * dim}
        position={[0, 0, WINDOW_DEPTH * 0.48]}
        depthTest={!emphasize}
        renderOrder={meshRenderOrder}
      />
      <mesh position={[0, 0, WINDOW_DEPTH * 0.44]} renderOrder={meshRenderOrder}>
        <boxGeometry args={[0.04, innerH, 0.03]} />
        <meshStandardMaterial
          color={emphasize || active ? "#f1f5f9" : "#94a3b8"}
          emissive={emphasize || active ? "#7dd3fc" : "#334155"}
          emissiveIntensity={(active || emphasize ? 0.25 : 0.06) * dim}
          metalness={0.35}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.44]} renderOrder={meshRenderOrder}>
        <boxGeometry args={[innerW, 0.04, 0.03]} />
        <meshStandardMaterial
          color={emphasize || active ? "#f1f5f9" : "#94a3b8"}
          emissive={emphasize || active ? "#7dd3fc" : "#334155"}
          emissiveIntensity={(active || emphasize ? 0.25 : 0.06) * dim}
          metalness={0.35}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

export function StructuralAssetMesh({
  asset,
  zones,
  selected,
  hovered,
  highlighted = false,
  dimmed = false,
  interactive = true,
  xrayShell = false,
  onSelect,
  onHover,
  onContextPick,
}: StructuralAssetMeshProps) {
  const kind = structuralKind(asset.class);
  const active = selected || hovered || highlighted;

  const placement = useMemo(
    () => resolveStructuralPlacement(asset, zones),
    [asset, zones],
  );

  const skeletonPos = placement?.position ?? asset.position;
  const yaw = placement?.yaw ?? 0;
  const meshRenderOrder = xrayShell ? 12 : 2;

  const hitSize = useMemo((): [number, number, number] => {
    if (kind === "door") return [DOOR_WIDTH + 0.2, DOOR_HEIGHT + 0.15, DOOR_DEPTH + 0.35];
    if (kind === "window") return [WINDOW_WIDTH + 0.15, WINDOW_HEIGHT + 0.15, WINDOW_DEPTH + 0.35];
    return [1, 1, 1];
  }, [kind]);

  const hitMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  const bindPointer = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(asset.id);
    },
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      onContextPick?.({
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
      onHover(asset.id);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(null);
      document.body.style.cursor = "auto";
    },
  };

  if (!kind || (zones.length > 0 && !placement)) {
    return null;
  }

  const [x, y, z] = skeletonPointToThree(
    skeletonPos[0],
    skeletonPos[1],
    skeletonPos[2],
  );

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh
        material={hitMaterial}
        renderOrder={meshRenderOrder}
        {...(interactive ? bindPointer : {})}
      >
        <boxGeometry args={hitSize} />
      </mesh>
      {kind === "door" ? (
        <DoorMesh active={active} dimmed={dimmed} xrayEmphasized={xrayShell} />
      ) : null}
      {kind === "window" ? (
        <WindowMesh active={active} dimmed={dimmed} xrayEmphasized={xrayShell} />
      ) : null}
      {selected ? (
        <mesh position={[0, kind === "door" ? DOOR_HEIGHT + 0.2 : WINDOW_HEIGHT + 0.15, 0]}>
          <coneGeometry args={[0.1, 0.18, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
      ) : null}
    </group>
  );
}

export function shouldRenderStructuralMesh(assetClass: string) {
  return isStructuralAssetClass(assetClass);
}
