"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import type { SceneContextTarget } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import type { FireIncident } from "@/lib/fire-incidents/types";

/** 뷰어에서 화재 지점이 한눈에 들어오도록 전체 스케일 */
const FLAME_SCALE = 2.65;

/** 펄스·깜빡임 주기 (값이 작을수록 느림) */
const PULSE_HZ = 2.1;
const FLICKER_HZ = 4.8;
const RING_PULSE_HZ = 2.4;
const RING_ROT_SPEED = 0.55;
const EMBER_RISE_HZ = 1.6;
const OPACITY_PULSE_HZ = 5;

const SEVERITY_COLOR = {
  low: {
    hot: "#fffbeb",
    mid: "#fde047",
    base: "#f59e0b",
    ember: "#fbbf24",
    ring: "#fde68a",
    glow: "#fbbf24",
    smoke: "#78350f",
  },
  medium: {
    hot: "#fff7ed",
    mid: "#fdba74",
    base: "#f97316",
    ember: "#fb923c",
    ring: "#fdba74",
    glow: "#fb923c",
    smoke: "#7c2d12",
  },
  high: {
    hot: "#fef2f2",
    mid: "#fca5a5",
    base: "#ef4444",
    ember: "#f87171",
    ring: "#fca5a5",
    glow: "#f87171",
    smoke: "#450a0a",
  },
} as const;

type FlamePalette = (typeof SEVERITY_COLOR)[keyof typeof SEVERITY_COLOR];

function createFlameTexture(palette: FlamePalette, variant: "outer" | "core") {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.Texture();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = 64;
  const baseY = 238;
  const tipY = variant === "core" ? 72 : 48;

  const gradient = ctx.createLinearGradient(cx, baseY, cx, tipY);
  if (variant === "core") {
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.12, palette.base);
    gradient.addColorStop(0.45, palette.mid);
    gradient.addColorStop(0.82, palette.hot);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
  } else {
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.08, palette.base);
    gradient.addColorStop(0.35, palette.mid);
    gradient.addColorStop(0.7, palette.hot);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
  }

  const wobble = variant === "core" ? 26 : 38;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.bezierCurveTo(cx - wobble, baseY - 70, cx - wobble * 0.55, tipY + 40, cx, tipY);
  ctx.bezierCurveTo(cx + wobble * 0.55, tipY + 40, cx + wobble, baseY - 70, cx, baseY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  if (variant === "outer") {
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.ellipse(cx - 18, baseY - 95, 14, 34, -0.25, 0, Math.PI * 2);
    ctx.fillStyle = palette.mid;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 20, baseY - 110, 12, 28, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = palette.hot;
    ctx.globalAlpha = 0.28;
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const EMBER_OFFSETS: ReadonlyArray<[number, number, number]> = [
  [-0.35, 0.15, 0.2],
  [0.28, 0.25, -0.18],
  [-0.15, 0.45, 0.3],
  [0.4, 0.2, 0.12],
  [-0.42, 0.35, -0.1],
  [0.12, 0.55, -0.28],
  [0.35, 0.1, -0.35],
  [-0.22, 0.5, 0.22],
];

export type FireIncidentMarkerProps = {
  incident: FireIncident;
  selected: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
  onContextPick?: (target: SceneContextTarget) => void;
};

export function FireIncidentMarker({
  incident,
  selected,
  interactive,
  onSelect,
  onContextPick,
}: FireIncidentMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const embersRef = useRef<THREE.Group>(null);
  const outerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const colors = SEVERITY_COLOR[incident.severity];

  const [x, y, z] = skeletonPointToThree(
    incident.position[0],
    incident.position[1],
    incident.position[2],
  );

  const outerTexture = useMemo(() => createFlameTexture(colors, "outer"), [colors]);
  const coreTexture = useMemo(() => createFlameTexture(colors, "core"), [colors]);

  useEffect(() => {
    return () => {
      outerTexture.dispose();
      coreTexture.dispose();
    };
  }, [outerTexture, coreTexture]);

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: colors.ring,
        transparent: true,
        opacity: selected ? 0.95 : 0.72,
        side: THREE.DoubleSide,
      }),
    [colors, selected],
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: colors.glow,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    [colors],
  );

  const outerMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: outerTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        opacity: 0.94,
      }),
    [outerTexture],
  );

  const coreMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: coreTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        opacity: 0.98,
      }),
    [coreTexture],
  );

  outerMatRef.current = outerMaterial;
  coreMatRef.current = coreMaterial;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker =
      0.92 + 0.1 * Math.sin(t * FLICKER_HZ) + 0.05 * Math.sin(t * FLICKER_HZ * 1.9);
    const pulse = 1 + 0.07 * Math.sin(t * PULSE_HZ);
    const scale = FLAME_SCALE * (selected ? 1.12 : 1) * pulse * flicker;

    if (groupRef.current) {
      groupRef.current.scale.setScalar(scale);
    }
    if (billboardRef.current) {
      billboardRef.current.quaternion.copy(state.camera.quaternion);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * RING_ROT_SPEED;
      const ringPulse = 1 + 0.06 * Math.sin(t * RING_PULSE_HZ);
      ringRef.current.scale.set(ringPulse, ringPulse, 1);
    }
    if (embersRef.current) {
      embersRef.current.children.forEach((child, index) => {
        const mesh = child as THREE.Mesh;
        const phase = t * EMBER_RISE_HZ + index * 1.37;
        const rise = (phase * 0.22) % 1.4;
        mesh.position.y = EMBER_OFFSETS[index][1] + rise;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.35 + 0.45 * (1 - rise / 1.4);
      });
    }
    if (outerMatRef.current) {
      outerMatRef.current.opacity =
        (selected ? 1 : 0.9) * (0.88 + 0.12 * Math.sin(t * OPACITY_PULSE_HZ));
    }
    if (coreMatRef.current) {
      coreMatRef.current.opacity = 0.92 + 0.08 * Math.sin(t * OPACITY_PULSE_HZ * 1.15 + 1);
    }
  });

  const bindPointer = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(incident.id);
        },
        onContextMenu: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          e.nativeEvent.preventDefault();
          onContextPick?.({
            position: incident.position,
            clientX: e.nativeEvent.clientX,
            clientY: e.nativeEvent.clientY,
            zoneId: incident.zone_id,
            zoneName: incident.zone_name,
            fireId: incident.id,
          });
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        },
        onPointerOut: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = "auto";
        },
      }
    : {};

  const planeW = 1.15;
  const planeH = 1.75;
  const billboardAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <pointLight
        color={colors.glow}
        intensity={selected ? 2.2 : 1.5}
        distance={7}
        decay={2}
        position={[0, 1.1 * FLAME_SCALE, 0]}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        material={glowMaterial}
        renderOrder={14}
      >
        <circleGeometry args={[1.35, 36]} />
      </mesh>
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        material={ringMaterial}
        renderOrder={15}
      >
        <ringGeometry args={[0.95, 1.28, 40]} />
      </mesh>

      <group ref={billboardRef} position={[0, 0.08, 0]} {...bindPointer}>
        {billboardAngles.map((angle, index) => (
          <group key={`outer-${index}`} rotation={[0, angle, 0]}>
            <mesh material={outerMaterial} renderOrder={17}>
              <planeGeometry args={[planeW, planeH]} />
            </mesh>
          </group>
        ))}
        {billboardAngles.map((angle, index) => (
          <group key={`core-${index}`} rotation={[0, angle + Math.PI / 6, 0]} scale={0.72}>
            <mesh material={coreMaterial} renderOrder={18}>
              <planeGeometry args={[planeW * 0.85, planeH * 0.9]} />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={embersRef} position={[0, 0.1, 0]}>
        {EMBER_OFFSETS.map((offset, index) => (
          <mesh key={index} position={offset} renderOrder={19}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial
              color={colors.ember}
              transparent
              opacity={0.7}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
