"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { assetClassStyle } from "@/lib/scene-graph-skeleton/assets";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import type { AssetStatus, FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";

const CORE_RADIUS = 0.34;
const CORE_RADIUS_SELECTED = 0.42;
const HIT_RADIUS = 0.58;

const FAULT_COLOR = 0xef4444;
const FAULT_EMISSIVE = 0xdc2626;
const INSPECTION_COLOR = 0xf59e0b;
const INSPECTION_EMISSIVE = 0xd97706;

export type AssetSpotProps = {
  asset: FacilityAssetRef;
  selected: boolean;
  hovered: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  interactive?: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

function statusPulseKind(
  status?: AssetStatus,
): "fault" | "inspection" | null {
  if (status === "fault" || status === "offline") return "fault";
  if (status === "inspection_due") return "inspection";
  return null;
}

export function AssetSpot({
  asset,
  selected,
  hovered,
  highlighted = false,
  dimmed = false,
  interactive = true,
  onSelect,
  onHover,
}: AssetSpotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const faultRingRef = useRef<THREE.Mesh>(null);
  const hitRef = useRef<THREE.Mesh>(null);
  const style = assetClassStyle(asset.class);
  const alertKind = statusPulseKind(asset.status);
  const [x, y, z] = skeletonPointToThree(
    asset.position[0],
    asset.position[1],
    asset.position[2],
  );
  const active = selected || hovered || highlighted;
  const coreRadius =
    selected || highlighted ? CORE_RADIUS_SELECTED : CORE_RADIUS;
  const dimFactor = dimmed ? 0.22 : 1;

  const coreColor =
    alertKind === "fault"
      ? FAULT_COLOR
      : alertKind === "inspection"
        ? INSPECTION_COLOR
        : highlighted
          ? 0xfff4a3
          : style.color;
  const coreEmissive =
    alertKind === "fault"
      ? FAULT_EMISSIVE
      : alertKind === "inspection"
        ? INSPECTION_EMISSIVE
        : highlighted
          ? 0xfbbf24
          : style.emissive;

  const coreMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: coreColor,
        emissive: coreEmissive,
        emissiveIntensity: (active ? 0.85 : alertKind ? 0.65 : 0.4) * dimFactor,
        transparent: dimmed,
        opacity: dimmed ? 0.35 : 1,
        metalness: 0.45,
        roughness: 0.2,
      }),
    [coreColor, coreEmissive, active, alertKind, dimFactor, dimmed],
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color:
          alertKind === "fault"
            ? 0xfca5a5
            : alertKind === "inspection"
              ? 0xfcd34d
              : highlighted
                ? 0xfde68a
                : style.ringColor,
        transparent: true,
        opacity: (active ? 0.95 : alertKind ? 0.75 : 0.55) * dimFactor,
        side: THREE.DoubleSide,
      }),
    [style.ringColor, active, highlighted, alertKind, dimFactor],
  );

  const faultRingMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: alertKind === "fault" ? 0xf87171 : 0xfbbf24,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    [alertKind],
  );

  const hitMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    const hit = hitRef.current;
    if (!hit) return;
    hit.renderOrder = 20;
    if (!interactive) hit.raycast = () => {};
  }, [interactive]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    let pulseAmp = highlighted ? 0.14 : active ? 0.1 : 0.04;
    let pulseSpeed = selected ? 5 : 3;
    if (alertKind === "fault") {
      pulseAmp = 0.22;
      pulseSpeed = 7;
    } else if (alertKind === "inspection") {
      pulseAmp = 0.16;
      pulseSpeed = 5.5;
    }
    const pulse = 1 + pulseAmp * Math.sin(t * pulseSpeed);
    if (groupRef.current) {
      const base = dimmed ? 0.88 : 1;
      groupRef.current.scale.setScalar(
        pulse * base * (selected || highlighted ? 1.15 : 1),
      );
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * (alertKind ? 1.4 : 0.8);
    }
    if (faultRingRef.current && alertKind) {
      const alertPulse = 0.55 + 0.4 * Math.sin(t * (alertKind === "fault" ? 8 : 6));
      faultRingMaterial.opacity = alertPulse * dimFactor;
      faultRingRef.current.scale.setScalar(1 + 0.25 * Math.sin(t * pulseSpeed));
    }
  });

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

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <mesh
        ref={hitRef}
        material={hitMaterial}
        renderOrder={20}
        {...(interactive ? bindPointer : {})}
      >
        <sphereGeometry args={[HIT_RADIUS, 16, 16]} />
      </mesh>
      <mesh renderOrder={12} material={coreMaterial}>
        <sphereGeometry args={[coreRadius, 24, 24]} />
      </mesh>
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={11}
        material={ringMaterial}
      >
        <ringGeometry args={[0.46, 0.62, 36]} />
      </mesh>
      {alertKind ? (
        <mesh
          ref={faultRingRef}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={10}
          material={faultRingMaterial}
        >
          <ringGeometry args={[0.68, 0.88, 36]} />
        </mesh>
      ) : null}
      <mesh position={[0, coreRadius + 0.12, 0]} renderOrder={13}>
        <cylinderGeometry args={[0.04, 0.04, coreRadius * 0.9, 8]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={coreEmissive}
          emissiveIntensity={0.5}
        />
      </mesh>
      {selected ? (
        <mesh position={[0, coreRadius + 0.45, 0]} renderOrder={14}>
          <coneGeometry args={[0.12, 0.22, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}
