"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import {
  OCCUPANT_AURA_RING_GEOMETRY,
  OCCUPANT_AURA_RING_MATERIAL,
  OCCUPANT_COLLAR_CENTER_Y,
  OCCUPANT_COLLAR_GLOW_GEOMETRY,
  OCCUPANT_COLLAR_GLOW_MATERIAL,
  OCCUPANT_EMPHASIS_RING_GEOMETRY,
  OCCUPANT_EMPHASIS_RING_MATERIAL,
  OCCUPANT_PAWN_GEOMETRY,
  OCCUPANT_PAWN_MATERIAL,
} from "@/lib/occupants/occupant-marker-visual";
import type { Occupant } from "@/lib/occupants/types";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";

const matrixScratch = new THREE.Object3D();
const PULSE_HZ = 2.2;

type OccupantsInstancedProps = {
  occupants: Occupant[];
};

function setOccupantMatrices(
  mesh: THREE.InstancedMesh,
  occupants: Occupant[],
  options: {
    yOffset?: number;
    rotation?: [number, number, number];
    scale?: number;
  },
) {
  const { yOffset = 0, rotation, scale = 1 } = options;

  for (let i = 0; i < occupants.length; i++) {
    const occupant = occupants[i]!;
    const [x, y, z] = skeletonPointToThree(
      occupant.position[0],
      occupant.position[1],
      occupant.position[2],
    );
    matrixScratch.position.set(x, y + yOffset, z);
    if (rotation) {
      matrixScratch.rotation.set(rotation[0], rotation[1], rotation[2]);
    } else {
      matrixScratch.rotation.set(0, 0, 0);
    }
    matrixScratch.scale.setScalar(scale);
    matrixScratch.updateMatrix();
    mesh.setMatrixAt(i, matrixScratch.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

function OccupantInstancedMesh({
  geometry,
  material,
  occupants,
  yOffset = 0,
  rotation,
  renderOrder,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  occupants: Occupant[];
  yOffset?: number;
  rotation?: [number, number, number];
  renderOrder: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || occupants.length === 0) return;
    setOccupantMatrices(mesh, occupants, { yOffset, rotation });
    mesh.raycast = () => {};
  }, [occupants, yOffset, rotation]);

  if (occupants.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, occupants.length]}
      renderOrder={renderOrder}
      frustumCulled={false}
    />
  );
}

export function OccupantsInstanced({ occupants }: OccupantsInstancedProps) {
  const auraMeshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = auraMeshRef.current;
    if (!mesh || occupants.length === 0) return;
    setOccupantMatrices(mesh, occupants, {
      yOffset: 0.015,
      rotation: [-Math.PI / 2, 0, 0],
    });
    mesh.raycast = () => {};
  }, [occupants]);

  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * Math.PI * 2 * PULSE_HZ);

    OCCUPANT_PAWN_MATERIAL.emissiveIntensity = 0.32 + pulse * 0.48;
    OCCUPANT_EMPHASIS_RING_MATERIAL.opacity = 0.38 + pulse * 0.42;
    OCCUPANT_AURA_RING_MATERIAL.opacity = 0.18 + pulse * 0.32;
    OCCUPANT_COLLAR_GLOW_MATERIAL.opacity = 0.22 + pulse * 0.38;

    const auraMesh = auraMeshRef.current;
    if (!auraMesh || occupants.length === 0) return;

    const auraScale = 1 + pulse * 0.12;
    setOccupantMatrices(auraMesh, occupants, {
      yOffset: 0.015,
      rotation: [-Math.PI / 2, 0, 0],
      scale: auraScale,
    });
  });

  if (occupants.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={auraMeshRef}
        args={[OCCUPANT_AURA_RING_GEOMETRY, OCCUPANT_AURA_RING_MATERIAL, occupants.length]}
        renderOrder={5}
        frustumCulled={false}
        raycast={() => {}}
      />
      <OccupantInstancedMesh
        geometry={OCCUPANT_EMPHASIS_RING_GEOMETRY}
        material={OCCUPANT_EMPHASIS_RING_MATERIAL}
        occupants={occupants}
        yOffset={0.02}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={6}
      />
      <OccupantInstancedMesh
        geometry={OCCUPANT_COLLAR_GLOW_GEOMETRY}
        material={OCCUPANT_COLLAR_GLOW_MATERIAL}
        occupants={occupants}
        yOffset={OCCUPANT_COLLAR_CENTER_Y}
        renderOrder={7}
      />
      <OccupantInstancedMesh
        geometry={OCCUPANT_PAWN_GEOMETRY}
        material={OCCUPANT_PAWN_MATERIAL}
        occupants={occupants}
        renderOrder={8}
      />
    </group>
  );
}
