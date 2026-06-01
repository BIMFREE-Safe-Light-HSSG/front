"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { isStructuralAssetClass } from "@/lib/scene-graph-skeleton/structural-assets";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import { wallYawFromZones } from "@/lib/scene-graph-skeleton/wall-orientation";
import type { SceneContextTarget } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import type { FacilityAssetRef, ZoneNode } from "@/lib/scene-graph-skeleton/types";

const DOOR_WIDTH = 0.92;
const DOOR_HEIGHT = 2.1;
const DOOR_DEPTH = 0.14;
const DOOR_FRAME = 0.08;
/** skeleton Z(수직) → Three Y 기준으로 문을 살짝 내려 바닥·벽면에 맞춤 */
const DOOR_VERTICAL_SINK = 0.2;

/** 어두운 캔버스(#0c1220) 위에서도 잘 보이도록 밝은 대비·외곽선 */
const DOOR_COLORS = {
  frame: "#8fa8c8",
  panel: "#dce9f8",
  frameEmissive: "#3b5f8f",
  panelEmissive: "#5b7aa8",
  outline: "#e8f4ff",
  glow: "#60a5fa",
  frameActive: "#fbbf24",
  panelActive: "#fff7d6",
  frameEmissiveActive: "#b45309",
  panelEmissiveActive: "#d97706",
  outlineActive: "#fef3c7",
  handle: "#f1f5f9",
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
  renderOrder = 12,
}: {
  width: number;
  height: number;
  depth: number;
  color: string;
  opacity?: number;
  position?: [number, number, number];
  renderOrder?: number;
}) {
  const geometry = useBoxOutline(width, height, depth);
  return (
    <lineSegments geometry={geometry} position={position} renderOrder={renderOrder}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthTest={false} />
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
}: {
  active: boolean;
  dimmed: boolean;
}) {
  const dim = dimmed ? 0.4 : 1;
  const frameColor = active ? DOOR_COLORS.frameActive : DOOR_COLORS.frame;
  const panelColor = active ? DOOR_COLORS.panelActive : DOOR_COLORS.panel;
  const frameEmissive = active ? DOOR_COLORS.frameEmissiveActive : DOOR_COLORS.frameEmissive;
  const panelEmissive = active ? DOOR_COLORS.panelEmissiveActive : DOOR_COLORS.panelEmissive;
  const outlineColor = active ? DOOR_COLORS.outlineActive : DOOR_COLORS.outline;
  const glowColor = active ? "#fcd34d" : DOOR_COLORS.glow;

  return (
    <group position={[0, DOOR_HEIGHT / 2, 0]} renderOrder={10}>
      <mesh position={[0, 0, -DOOR_DEPTH * 0.35]} renderOrder={8}>
        <planeGeometry args={[DOOR_WIDTH + 0.18, DOOR_HEIGHT + 0.12]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={(active ? 0.28 : 0.16) * dim}
          depthWrite={false}
        />
      </mesh>
      <mesh castShadow receiveShadow renderOrder={9}>
        <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH]} />
        <meshStandardMaterial
          color={frameColor}
          emissive={frameEmissive}
          emissiveIntensity={(active ? 0.55 : 0.42) * dim}
          metalness={0.15}
          roughness={0.45}
          transparent={dimmed}
          opacity={dim}
        />
      </mesh>
      <mesh position={[0, 0, DOOR_DEPTH * 0.42]} castShadow renderOrder={10}>
        <boxGeometry
          args={[DOOR_WIDTH - DOOR_FRAME * 2, DOOR_HEIGHT - DOOR_FRAME * 2, DOOR_DEPTH * 0.5]}
        />
        <meshStandardMaterial
          color={panelColor}
          emissive={panelEmissive}
          emissiveIntensity={(active ? 0.48 : 0.36) * dim}
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
        opacity={(active ? 1 : 0.88) * dim}
        position={[0, 0, DOOR_DEPTH * 0.5]}
      />
      <mesh position={[0, -DOOR_HEIGHT * 0.5 + 0.04, DOOR_DEPTH * 0.48]} renderOrder={10}>
        <boxGeometry args={[DOOR_WIDTH + 0.06, 0.06, DOOR_DEPTH * 0.35]} />
        <meshStandardMaterial
          color={active ? "#fbbf24" : "#94a3b8"}
          emissive={active ? "#b45309" : "#475569"}
          emissiveIntensity={0.35 * dim}
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
          emissiveIntensity={active ? 0.45 : 0.28}
          metalness={0.7}
          roughness={0.22}
        />
      </mesh>
      {active ? (
        <mesh position={[0, DOOR_HEIGHT * 0.42, DOOR_DEPTH * 0.72]} renderOrder={11}>
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
}: {
  active: boolean;
  dimmed: boolean;
}) {
  const dim = dimmed ? 0.4 : 1;
  const frameColor = active ? "#f8fafc" : "#cbd5e1";
  const frameEmissive = active ? "#0ea5e9" : "#38bdf8";
  const outlineColor = active ? "#fef9c3" : "#f0f9ff";
  const glowColor = active ? "#7dd3fc" : "#38bdf8";

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: frameColor,
        emissive: frameEmissive,
        emissiveIntensity: (active ? 0.35 : 0.28) * dim,
        metalness: 0.4,
        roughness: 0.3,
        transparent: dimmed,
        opacity: dim,
      }),
    [active, dimmed, dim, frameColor, frameEmissive],
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: active ? "#e0f2fe" : "#bae6fd",
        emissive: active ? "#38bdf8" : "#0ea5e9",
        emissiveIntensity: (active ? 0.35 : 0.28) * dim,
        metalness: 0,
        roughness: 0.02,
        transmission: 0.55,
        thickness: 0.2,
        ior: 1.45,
        transparent: true,
        opacity: dimmed ? 0.35 : 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [active, dimmed, dim],
  );

  const mullionMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: active ? "#e2e8f0" : "#94a3b8",
        emissive: active ? "#0284c7" : "#475569",
        emissiveIntensity: 0.22 * dim,
        metalness: 0.55,
        roughness: 0.35,
      }),
    [active, dim],
  );

  const innerW = WINDOW_WIDTH - WINDOW_FRAME * 2;
  const innerH = WINDOW_HEIGHT - WINDOW_FRAME * 2;

  return (
    <group position={[0, WINDOW_HEIGHT / 2, 0]} renderOrder={10}>
      <mesh position={[0, 0, -WINDOW_DEPTH * 0.3]} renderOrder={8}>
        <planeGeometry args={[WINDOW_WIDTH + 0.2, WINDOW_HEIGHT + 0.16]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={(active ? 0.32 : 0.2) * dim}
          depthWrite={false}
        />
      </mesh>
      <mesh material={frameMat} castShadow renderOrder={9}>
        <boxGeometry args={[WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_DEPTH]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.28]} material={glassMat} renderOrder={10}>
        <boxGeometry args={[innerW, innerH, 0.03]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.38]} material={mullionMat} renderOrder={11}>
        <boxGeometry args={[WINDOW_FRAME, innerH, 0.04]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.38]} material={mullionMat} renderOrder={11}>
        <boxGeometry args={[innerW, WINDOW_FRAME, 0.04]} />
      </mesh>
      <BoxOutline
        width={WINDOW_WIDTH + 0.02}
        height={WINDOW_HEIGHT + 0.02}
        depth={WINDOW_DEPTH + 0.04}
        color={outlineColor}
        opacity={(active ? 1 : 0.9) * dim}
        position={[0, 0, WINDOW_DEPTH * 0.48]}
      />
      <mesh position={[0, 0, WINDOW_DEPTH * 0.44]} renderOrder={11}>
        <boxGeometry args={[0.04, innerH, 0.03]} />
        <meshStandardMaterial
          color="#f1f5f9"
          emissive="#7dd3fc"
          emissiveIntensity={0.25 * dim}
          metalness={0.35}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.44]} renderOrder={11}>
        <boxGeometry args={[innerW, 0.04, 0.03]} />
        <meshStandardMaterial
          color="#f1f5f9"
          emissive="#7dd3fc"
          emissiveIntensity={0.25 * dim}
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
  onSelect,
  onHover,
  onContextPick,
}: StructuralAssetMeshProps) {
  const kind = structuralKind(asset.class);
  const active = selected || hovered || highlighted;

  const skeletonZ =
    kind === "door" ? asset.position[2] - DOOR_VERTICAL_SINK : asset.position[2];

  const [x, y, z] = skeletonPointToThree(asset.position[0], asset.position[1], skeletonZ);

  const yaw = useMemo(
    () => wallYawFromZones(zones, asset.position[0], asset.position[1]),
    [zones, asset.position],
  );

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

  if (!kind) {
    return null;
  }

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh
        material={hitMaterial}
        renderOrder={20}
        {...(interactive ? bindPointer : {})}
      >
        <boxGeometry args={hitSize} />
      </mesh>
      {kind === "door" ? <DoorMesh active={active} dimmed={dimmed} /> : null}
      {kind === "window" ? <WindowMesh active={active} dimmed={dimmed} /> : null}
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
