/**
 * fire-risk-assessments API·scene graph raw JSON 파싱.
 * 백엔드 snake_case 응답을 FireRisk* 타입으로 정규화.
 */
import type {
  FireRiskAssessmentResult,
  FireRiskFinding,
  FireRiskOverlay,
  FireRiskSeverity,
} from "@/lib/fire-risk-assessments/types";

const FIRE_RISK_SEVERITIES = new Set<FireRiskSeverity>([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseFireRiskSeverity(value: unknown): FireRiskSeverity | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase() as FireRiskSeverity;
  return FIRE_RISK_SEVERITIES.has(upper) ? upper : null;
}

export function parseFireRiskFinding(raw: unknown): FireRiskFinding | null {
  if (!isRecord(raw)) return null;

  const target_node_id = readString(raw.target_node_id);
  const severity = parseFireRiskSeverity(raw.severity);
  const category = readString(raw.category);
  const reason = readString(raw.reason);
  const recommendation = readString(raw.recommendation);
  const confidence = readNumber(raw.confidence);

  if (!target_node_id || !severity) return null;

  return {
    target_node_id,
    severity,
    category,
    reason,
    recommendation,
    confidence,
  };
}

export function parseFireRiskOverlay(raw: unknown): FireRiskOverlay | null {
  if (!isRecord(raw)) return null;

  const id = readString(raw.id);
  const typeRaw = readString(raw.type).toUpperCase();
  const severity = parseFireRiskSeverity(raw.severity);
  const target_node_id = readString(raw.target_node_id);

  if (!id || typeRaw !== "FIRE_RISK" || !severity || !target_node_id) {
    return null;
  }

  return {
    id,
    type: "FIRE_RISK",
    source: readString(raw.source),
    assessment_id: readString(raw.assessment_id),
    assessment_model: readString(raw.assessment_model),
    assessed_at: readString(raw.assessed_at),
    target_node_id,
    severity,
    category: readString(raw.category),
    reason: readString(raw.reason),
    recommendation: readString(raw.recommendation),
    confidence: readNumber(raw.confidence),
    status: readString(raw.status, "ACTIVE"),
  };
}

/** scene_graph JSON 또는 SceneGraphResponse 전체에서 fire_risks overlay 추출 */
export function parseFireRiskOverlaysFromSceneGraph(sceneGraph: unknown): FireRiskOverlay[] {
  if (!isRecord(sceneGraph)) return [];

  const overlays = isRecord(sceneGraph.overlays) ? sceneGraph.overlays : null;
  if (!overlays) return [];

  const items = overlays.fire_risks;
  if (!Array.isArray(items)) return [];

  return items
    .map(parseFireRiskOverlay)
    .filter((item): item is FireRiskOverlay => item !== null);
}

export function parseFireRiskAssessmentResponse(raw: unknown): FireRiskAssessmentResult {
  if (!isRecord(raw)) {
    throw new Error("Invalid fire-risk-assessments response: expected object.");
  }

  const assessment_id = readString(raw.assessment_id);
  const building_id = readString(raw.building_id);
  const building_name = readString(raw.building_name);
  const graph_data_id = readString(raw.graph_data_id);

  if (!assessment_id || !building_id || !graph_data_id) {
    throw new Error("Invalid fire-risk-assessments response: missing required fields.");
  }

  const scene_graph = isRecord(raw.scene_graph) ? raw.scene_graph : {};
  const findingsRaw = Array.isArray(raw.findings) ? raw.findings : [];

  return {
    assessment_id,
    building_id,
    building_name,
    model: readString(raw.model),
    summary: readString(raw.summary),
    risk_count: readNumber(raw.risk_count),
    findings: findingsRaw
      .map(parseFireRiskFinding)
      .filter((item): item is FireRiskFinding => item !== null),
    scene_graph_updated: readBoolean(raw.scene_graph_updated),
    graph_data_id,
    previous_graph_data_id: readOptionalString(raw.previous_graph_data_id),
    created_at: readString(raw.created_at),
    scene_graph,
    fire_risks: parseFireRiskOverlaysFromSceneGraph(scene_graph),
  };
}

/** scene graph에 저장된 fire_risks overlay만으로 결과 보기용 객체 생성 */
export function buildFireRiskResultFromSceneGraph(graph: {
  building_id: string;
  building_name: string;
  graph_data_id: string;
  created_at: string;
  scene_graph: unknown;
}): FireRiskAssessmentResult | null {
  const fire_risks = parseFireRiskOverlaysFromSceneGraph(graph.scene_graph);
  if (fire_risks.length === 0) return null;

  const first = fire_risks[0]!;

  return {
    assessment_id: first.assessment_id,
    building_id: graph.building_id,
    building_name: graph.building_name,
    model: first.assessment_model,
    summary: "",
    risk_count: fire_risks.length,
    findings: fire_risks.map((overlay) => ({
      target_node_id: overlay.target_node_id,
      severity: overlay.severity,
      category: overlay.category,
      reason: overlay.reason,
      recommendation: overlay.recommendation,
      confidence: overlay.confidence,
    })),
    scene_graph_updated: false,
    graph_data_id: graph.graph_data_id,
    previous_graph_data_id: null,
    created_at: first.assessed_at || graph.created_at,
    scene_graph: isRecord(graph.scene_graph) ? graph.scene_graph : {},
    fire_risks,
  };
}
