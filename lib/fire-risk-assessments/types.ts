/**
 * Gemini 화재 취약 분석 API 응답 타입.
 * back/FRONT.md — POST /buildings/{id}/fire-risk-assessments, overlays.fire_risks
 */
import type { SceneGraph } from "@/app/api/viewer";

/** back/FRONT.md — Gemini fire-risk severity */
export type FireRiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FireRiskFinding = {
  target_node_id: string;
  severity: FireRiskSeverity;
  category: string;
  reason: string;
  recommendation: string;
  confidence: number;
};

/** scene_graph.overlays.fire_risks item */
export type FireRiskOverlay = {
  id: string;
  type: "FIRE_RISK";
  source: string;
  assessment_id: string;
  assessment_model: string;
  assessed_at: string;
  target_node_id: string;
  severity: FireRiskSeverity;
  category: string;
  reason: string;
  recommendation: string;
  confidence: number;
  status: string;
};

/** POST /buildings/{building_id}/fire-risk-assessments 응답 */
export type FireRiskAssessmentResult = {
  assessment_id: string;
  building_id: string;
  building_name: string;
  model: string;
  summary: string;
  risk_count: number;
  findings: FireRiskFinding[];
  scene_graph_updated: boolean;
  graph_data_id: string;
  previous_graph_data_id: string | null;
  created_at: string;
  scene_graph: SceneGraph["scene_graph"];
  /** 파싱된 fire_risks overlay (scene_graph에서 추출) */
  fire_risks: FireRiskOverlay[];
};
