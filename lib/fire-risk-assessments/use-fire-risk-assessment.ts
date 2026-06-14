"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildFireRiskResultFromSceneGraph,
  isFireRiskAssessmentConflict,
  isFireRiskAssessmentGatewayError,
  requestFireRiskAssessment,
} from "@/app/api/fire-risk-assessments";
import type { SceneGraph } from "@/app/api/viewer";
import type { FireRiskAssessmentResult, FireRiskOverlay } from "@/lib/fire-risk-assessments/types";
import { handleUnauthorized } from "@/lib/http/errors";

type SceneGraphStatus = "idle" | "loading" | "ready" | "empty" | "forbidden" | "error";

type UseFireRiskAssessmentOptions = {
  selectedBuildingId: string | null;
  sceneGraph: SceneGraph | null;
  sceneGraphStatus: SceneGraphStatus;
  onSceneGraphUpdate?: (next: SceneGraph) => void;
};

export function useFireRiskAssessment({
  selectedBuildingId,
  sceneGraph,
  sceneGraphStatus,
  onSceneGraphUpdate,
}: UseFireRiskAssessmentOptions) {
  const router = useRouter();

  const [fireRiskPanelOpen, setFireRiskPanelOpen] = useState(false);
  const [fireRiskLoading, setFireRiskLoading] = useState(false);
  const [fireRiskError, setFireRiskError] = useState<string | null>(null);
  const [fireRiskResult, setFireRiskResult] = useState<FireRiskAssessmentResult | null>(null);
  const [fireRiskCache, setFireRiskCache] = useState<Record<string, FireRiskAssessmentResult>>({});
  const [selectedFireRiskId, setSelectedFireRiskId] = useState<string | null>(null);
  const [fireRiskFocusSeq, setFireRiskFocusSeq] = useState(0);

  const canViewFireRiskResults = useMemo(() => {
    if (!selectedBuildingId || !fireRiskResult) return false;
    if (fireRiskResult.building_id !== selectedBuildingId) return false;
    return (
      fireRiskResult.fire_risks.length > 0 ||
      fireRiskResult.findings.length > 0 ||
      fireRiskResult.risk_count > 0 ||
      Boolean(fireRiskResult.summary)
    );
  }, [selectedBuildingId, fireRiskResult]);

  const selectedFireRisk = useMemo(
    () => fireRiskResult?.fire_risks.find((risk) => risk.id === selectedFireRiskId) ?? null,
    [fireRiskResult, selectedFireRiskId],
  );

  useEffect(() => {
    if (!selectedBuildingId) {
      setFireRiskResult(null);
      return;
    }

    const cached = fireRiskCache[selectedBuildingId];
    if (cached) {
      setFireRiskResult(cached);
      return;
    }

    if (sceneGraph?.building_id === selectedBuildingId) {
      const fromGraph = buildFireRiskResultFromSceneGraph(sceneGraph);
      if (fromGraph) {
        setFireRiskResult(fromGraph);
        return;
      }
    }

    setFireRiskResult((current) =>
      current?.building_id === selectedBuildingId ? current : null,
    );
  }, [selectedBuildingId, sceneGraph, fireRiskCache]);

  const resetForBuildingChange = useCallback(() => {
    setFireRiskPanelOpen(false);
    setFireRiskError(null);
    setSelectedFireRiskId(null);
  }, []);

  const handleFireRiskCheck = useCallback(async () => {
    if (!selectedBuildingId) {
      alert("점검할 건물을 먼저 선택해주세요.");
      return;
    }

    if (sceneGraphStatus !== "ready" || !sceneGraph) {
      alert("scene graph가 있는 건물을 선택해주세요.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/sign-in");
      return;
    }

    setFireRiskPanelOpen(true);
    setFireRiskLoading(true);
    setFireRiskError(null);
    setSelectedFireRiskId(null);

    try {
      const result = await requestFireRiskAssessment(token, selectedBuildingId);
      setFireRiskResult(result);
      setFireRiskCache((current) => ({
        ...current,
        [selectedBuildingId]: result,
      }));

      if (result.scene_graph_updated) {
        onSceneGraphUpdate?.({
          building_id: result.building_id,
          building_name: result.building_name,
          graph_data_id: result.graph_data_id,
          created_at: result.created_at,
          scene_graph: result.scene_graph,
        });
      }
    } catch (error) {
      if (handleUnauthorized(error, () => router.push("/sign-in"))) {
        return;
      }

      if (isFireRiskAssessmentConflict(error)) {
        setFireRiskError("씬 그래프가 변경되었습니다. 건물을 다시 선택한 뒤 재시도해 주세요.");
      } else if (isFireRiskAssessmentGatewayError(error)) {
        setFireRiskError("Gemini 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        setFireRiskError("취약점검 요청에 실패했습니다.");
      }
    } finally {
      setFireRiskLoading(false);
    }
  }, [
    onSceneGraphUpdate,
    router,
    sceneGraph,
    sceneGraphStatus,
    selectedBuildingId,
  ]);

  const handleSelectFireRisk = useCallback((overlay: FireRiskOverlay) => {
    setSelectedFireRiskId(overlay.id);
    setFireRiskFocusSeq((value) => value + 1);
  }, []);

  const handleViewFireRiskResults = useCallback(() => {
    if (!canViewFireRiskResults) return;
    setFireRiskError(null);
    setFireRiskPanelOpen(true);
  }, [canViewFireRiskResults]);

  return {
    fireRiskPanelOpen,
    setFireRiskPanelOpen,
    fireRiskLoading,
    fireRiskError,
    fireRiskResult,
    selectedFireRiskId,
    selectedFireRisk,
    fireRiskFocusSeq,
    canViewFireRiskResults,
    handleFireRiskCheck,
    handleSelectFireRisk,
    handleViewFireRiskResults,
    resetForBuildingChange,
  };
}
