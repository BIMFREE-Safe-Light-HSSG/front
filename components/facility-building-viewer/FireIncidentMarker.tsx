"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import type { FireIncident } from "@/lib/fire-incidents/types";

const SEVERITY_COLOR = {
  low: { core: "#fbbf24", emissive: "#d97706", ring: "#fde68a" },
  medium: { core: "#f97316", emissive: "#ea580c", ring: "#fdba74" },
  high: { core: "#ef4444", emissive: "#dc2626", ring: "#fca5a5" },
} as const;

export type FireIncidentMarkerProps = {
  incident: FireIncident;
  selected: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
};

export function FireIncidentMarker({
  incident,
  selected,
  interactive,
  onSelect,
}: FireIncidentMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const colors = SEVERITY_COLOR[incident.severity];

  const [x, y, z] = skeletonPointToThree(
    incident.position[0],
    incident.position[1],
    incident.position[2],
  );

  const coreMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.core,
        emissive: colors.emissive,
        emissiveIntensity: selected ? 1.1 : 0.75,
        metalness: 0.1,
        roughness: 0.35,
      }),
    [colors, selected],
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: colors.ring,
        transparent: true,
        opacity: selected ? 0.9 : 0.55,
        side: THREE.DoubleSide,
      }),
    [colors, selected],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + 0.12 * Math.sin(t * 5);
    if (groupRef.current) {
      groupRef.current.scale.setScalar(selected ? pulse * 1.1 : pulse);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.2;
    }
  });

  const bindPointer = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(incident.id);
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

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
        material={ringMaterial}
        renderOrder={15}
      >
        <ringGeometry args={[0.55, 0.75, 32]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={coreMaterial} castShadow {...bindPointer}>
        <coneGeometry args={[0.28, 1.05, 12]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} {...bindPointer}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#fbbf24"
          emissiveIntensity={0.9}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}
