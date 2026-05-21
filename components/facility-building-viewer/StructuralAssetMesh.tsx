"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { isStructuralAssetClass } from "@/lib/scene-graph-skeleton/structural-assets";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import { wallYawFromZones } from "@/lib/scene-graph-skeleton/wall-orientation";
import type { FacilityAssetRef, ZoneNode } from "@/lib/scene-graph-skeleton/types";

const DOOR_WIDTH = 0.92;
const DOOR_HEIGHT = 2.1;
const DOOR_DEPTH = 0.1;
const DOOR_FRAME = 0.08;
/** skeleton Z(수직) → Three Y 기준으로 문을 살짝 내려 바닥·벽면에 맞춤 */
const DOOR_VERTICAL_SINK = 0.2;

/** 뷰어 캔버스(#0c1220) · 구역 팔레트 · 골드 하이라이트와 맞춘 문 색 */
const DOOR_COLORS = {
  frame: "#5c6b82",
  panel: "#a8bdd9",
  frameEmissive: "#1e3a5f",
  panelEmissive: "#334155",
  frameActive: "#fbbf24",
  panelActive: "#fde68a",
  frameEmissiveActive: "#b45309",
  panelEmissiveActive: "#d97706",
  handle: "#e2e8f0",
  handleActive: "#fffbeb",
} as const;

const WINDOW_WIDTH = 1.35;
const WINDOW_HEIGHT = 1.05;
const WINDOW_FRAME = 0.07;
const WINDOW_DEPTH = 0.08;

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
  const dim = dimmed ? 0.35 : 1;
  const frameColor = active ? DOOR_COLORS.frameActive : DOOR_COLORS.frame;
  const panelColor = active ? DOOR_COLORS.panelActive : DOOR_COLORS.panel;
  const frameEmissive = active ? DOOR_COLORS.frameEmissiveActive : DOOR_COLORS.frameEmissive;
  const panelEmissive = active ? DOOR_COLORS.panelEmissiveActive : DOOR_COLORS.panelEmissive;

  return (
    <group position={[0, DOOR_HEIGHT / 2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH]} />
        <meshStandardMaterial
          color={frameColor}
          emissive={frameEmissive}
          emissiveIntensity={(active ? 0.42 : 0.28) * dim}
          metalness={0.2}
          roughness={0.55}
          transparent={dimmed}
          opacity={dim}
        />
      </mesh>
      <mesh position={[0, 0, DOOR_DEPTH * 0.35]} castShadow>
        <boxGeometry
          args={[DOOR_WIDTH - DOOR_FRAME * 2, DOOR_HEIGHT - DOOR_FRAME * 2, DOOR_DEPTH * 0.55]}
        />
        <meshStandardMaterial
          color={panelColor}
          emissive={panelEmissive}
          emissiveIntensity={(active ? 0.38 : 0.22) * dim}
          metalness={0.12}
          roughness={0.48}
          transparent={dimmed}
          opacity={dim}
        />
      </mesh>
      <mesh position={[DOOR_WIDTH * 0.32, -DOOR_HEIGHT * 0.05, DOOR_DEPTH * 0.52]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.12, 10]} />
        <meshStandardMaterial
          color={active ? DOOR_COLORS.handleActive : DOOR_COLORS.handle}
          emissive={active ? "#fbbf24" : "#64748b"}
          emissiveIntensity={active ? 0.35 : 0.15}
          metalness={0.65}
          roughness={0.28}
        />
      </mesh>
      {active ? (
        <mesh position={[0, DOOR_HEIGHT * 0.42, DOOR_DEPTH * 0.65]}>
          <boxGeometry args={[0.04, 0.04, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.55} />
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
  const dim = dimmed ? 0.35 : 1;
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: active ? "#e2e8f0" : "#94a3b8",
        emissive: active ? "#0369a1" : "#000000",
        emissiveIntensity: active ? 0.2 : 0,
        metalness: 0.55,
        roughness: 0.35,
        transparent: dimmed,
        opacity: dim,
      }),
    [active, dimmed, dim],
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: active ? "#bae6fd" : "#7dd3fc",
        emissive: active ? "#0ea5e9" : "#0284c7",
        emissiveIntensity: active ? 0.15 : 0.05,
        metalness: 0,
        roughness: 0.05,
        transmission: 0.82,
        thickness: 0.15,
        ior: 1.45,
        transparent: true,
        opacity: dimmed ? 0.25 : 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [active, dimmed, dim],
  );

  const innerW = WINDOW_WIDTH - WINDOW_FRAME * 2;
  const innerH = WINDOW_HEIGHT - WINDOW_FRAME * 2;

  return (
    <group position={[0, WINDOW_HEIGHT / 2, 0]}>
      <mesh material={frameMat} castShadow>
        <boxGeometry args={[WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_DEPTH]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.2]} material={glassMat}>
        <boxGeometry args={[innerW, innerH, 0.02]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.28]} material={frameMat}>
        <boxGeometry args={[WINDOW_FRAME * 0.9, innerH, 0.03]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.28]} material={frameMat}>
        <boxGeometry args={[innerW, WINDOW_FRAME * 0.9, 0.03]} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.32]}>
        <boxGeometry args={[0.03, innerH, 0.02]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, WINDOW_DEPTH * 0.32]}>
        <boxGeometry args={[innerW, 0.03, 0.02]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
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
