"use client";

import type { SceneBounds } from "@/lib/scene-graph-skeleton/bounds";

export type ViewerSceneTheme = "day" | "emergency";

type SceneEnvironmentProps = {
  bounds: SceneBounds;
  theme: ViewerSceneTheme;
};

export function SceneEnvironment({ bounds, theme }: SceneEnvironmentProps) {
  const maxDim = Math.max(bounds.size[0], bounds.size[1], bounds.size[2], 1);
  const fogNear = maxDim * 1.8;
  const fogFar = maxDim * 7.5;

  const isEmergency = theme === "emergency";

  const background = isEmergency ? "#1a0a0c" : "#0f172a";
  const fogColor = isEmergency ? "#1a0a0c" : "#0f172a";
  const hemiSky = isEmergency ? "#fecaca" : "#bae6fd";
  const hemiGround = isEmergency ? "#292524" : "#1e293b";
  const hemiIntensity = isEmergency ? 0.42 : 0.38;
  const ambientIntensity = isEmergency ? 0.48 : 0.32;
  const keyIntensity = isEmergency ? 1.05 : 0.95;
  const rimColor = isEmergency ? "#f87171" : "#93c5fd";
  const rimIntensity = isEmergency ? 0.42 : 0.38;

  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      <hemisphereLight
        args={[hemiSky, hemiGround, hemiIntensity]}
        position={[0, maxDim, 0]}
      />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[12, 18, 8]} intensity={keyIntensity} />
      <directionalLight
        position={[-10, 14, -8]}
        intensity={rimIntensity}
        color={rimColor}
      />
    </>
  );
}
