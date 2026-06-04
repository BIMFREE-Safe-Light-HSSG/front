"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneContextTarget } from "@/components/facility-building-viewer/BuildingSceneCanvas";
import {
  FIRE_BILLBOARD_PLANE,
  FIRE_PICK_SPHERE,
  FIRE_SEVERITY_COLOR,
  getFireFlameTexture,
} from "@/lib/fire-incidents/fire-marker-visual";
import { skeletonPointToThree } from "@/lib/scene-graph-skeleton/coordinates";
import type { FireIncident, FireSeverity } from "@/lib/fire-incidents/types";

const matrixScratch = new THREE.Object3D();
const SEVERITIES: FireSeverity[] = ["low", "medium", "high"];
const STATIC_FLAME_SCALE = 1.85;

const pickMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

function pickIncidentFromEvent(
  incidents: FireIncident[],
  event: ThreeEvent<MouseEvent | PointerEvent>,
): FireIncident | null {
  let instanceId = event.instanceId;
  if (instanceId === undefined) {
    const hit = event.intersections.find(
      (item) => item.instanceId !== undefined && item.object === event.object,
    );
    instanceId = hit?.instanceId;
  }
  if (instanceId === undefined || instanceId < 0) return null;
  return incidents[instanceId] ?? null;
}

function SeverityFireBatch({
  severity,
  incidents,
  interactive,
  onSelect,
  onHover,
  onContextPick,
}: {
  severity: FireSeverity;
  incidents: FireIncident[];
  interactive: boolean;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
  onContextPick?: (target: SceneContextTarget) => void;
}) {
  const { camera } = useThree();
  const visualRef = useRef<THREE.InstancedMesh>(null);
  const pickRef = useRef<THREE.InstancedMesh>(null);
  const palette = FIRE_SEVERITY_COLOR[severity];

  const visualMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getFireFlameTexture(palette, "outer"),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        opacity: 0.92,
      }),
    [palette],
  );

  const syncPickMatrices = () => {
    const mesh = pickRef.current;
    if (!mesh || incidents.length === 0) return;
    for (let i = 0; i < incidents.length; i++) {
      const incident = incidents[i]!;
      const [x, y, z] = skeletonPointToThree(
        incident.position[0],
        incident.position[1],
        incident.position[2],
      );
      matrixScratch.position.set(x, y, z);
      matrixScratch.scale.setScalar(1);
      matrixScratch.updateMatrix();
      mesh.setMatrixAt(i, matrixScratch.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const mesh = visualRef.current;
    if (mesh) mesh.raycast = () => {};
    syncPickMatrices();
  }, [incidents]);

  useFrame(() => {
    const mesh = visualRef.current;
    if (!mesh || incidents.length === 0) return;

    for (let i = 0; i < incidents.length; i++) {
      const incident = incidents[i]!;
      const [x, y, z] = skeletonPointToThree(
        incident.position[0],
        incident.position[1],
        incident.position[2],
      );
      matrixScratch.position.set(x, y + 0.5, z);
      matrixScratch.scale.setScalar(STATIC_FLAME_SCALE);
      matrixScratch.lookAt(camera.position);
      matrixScratch.updateMatrix();
      mesh.setMatrixAt(i, matrixScratch.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const pointerHandlers = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const incident = pickIncidentFromEvent(incidents, e);
          if (incident) onSelect(incident.id);
        },
        onContextMenu: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          e.nativeEvent.preventDefault();
          const incident = pickIncidentFromEvent(incidents, e);
          if (!incident || !onContextPick) return;
          onContextPick({
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
          const incident = pickIncidentFromEvent(incidents, e);
          if (incident) {
            onHover?.(incident.id);
            document.body.style.cursor = "pointer";
          }
        },
        onPointerOut: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover?.(null);
          document.body.style.cursor = "auto";
        },
      }
    : {};

  if (incidents.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={visualRef}
        args={[FIRE_BILLBOARD_PLANE, visualMaterial, incidents.length]}
        frustumCulled
        renderOrder={16}
      />
      <instancedMesh
        ref={pickRef}
        args={[FIRE_PICK_SPHERE, pickMaterial, incidents.length]}
        frustumCulled={false}
        renderOrder={20}
        {...pointerHandlers}
      />
    </group>
  );
}

export type FireIncidentsInstancedProps = {
  incidents: FireIncident[];
  interactive?: boolean;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
  onContextPick?: (target: SceneContextTarget) => void;
};

export function FireIncidentsInstanced({
  incidents,
  interactive = true,
  onSelect,
  onHover,
  onContextPick,
}: FireIncidentsInstancedProps) {
  const bySeverity = useMemo(() => {
    const groups: Record<FireSeverity, FireIncident[]> = {
      low: [],
      medium: [],
      high: [],
    };
    for (const incident of incidents) {
      groups[incident.severity].push(incident);
    }
    return groups;
  }, [incidents]);

  if (incidents.length === 0) return null;

  return (
    <group>
      {SEVERITIES.map((severity) => (
        <SeverityFireBatch
          key={severity}
          severity={severity}
          incidents={bySeverity[severity]}
          interactive={interactive}
          onSelect={onSelect}
          onHover={onHover}
          onContextPick={onContextPick}
        />
      ))}
    </group>
  );
}
