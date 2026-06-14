/**
 * Gemini 화재 취약 분석 API 클라이언트.
 * POST /buildings/{id}/fire-risk-assessments 호출 + parse re-export
 */
import axios from "axios";

import { apiUrl } from "@/lib/api/client";
import { getAxiosErrorStatus } from "@/lib/http/errors";
import { parseFireRiskAssessmentResponse } from "@/lib/fire-risk-assessments/parse";
import type { FireRiskAssessmentResult } from "@/lib/fire-risk-assessments/types";

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

/**
 * POST /buildings/{building_id}/fire-risk-assessments
 * back/FRONT.md — request body 없음, Gemini 분석 완료까지 동기 대기
 */
export async function requestFireRiskAssessment(
  accessToken: string,
  buildingId: string,
): Promise<FireRiskAssessmentResult> {
  const response = await axios.post(
    apiUrl(`/buildings/${buildingId}/fire-risk-assessments`),
    null,
    {
      headers: authHeaders(accessToken),
    },
  );

  return parseFireRiskAssessmentResponse(response.data);
}

export function isFireRiskAssessmentConflict(error: unknown): boolean {
  return getAxiosErrorStatus(error) === 409;
}

export function isFireRiskAssessmentGatewayError(error: unknown): boolean {
  return getAxiosErrorStatus(error) === 502;
}

export type { FireRiskAssessmentResult, FireRiskFinding, FireRiskOverlay, FireRiskSeverity } from "@/lib/fire-risk-assessments/types";
export {
  parseFireRiskAssessmentResponse,
  parseFireRiskFinding,
  parseFireRiskOverlay,
  parseFireRiskOverlaysFromSceneGraph,
  parseFireRiskSeverity,
  buildFireRiskResultFromSceneGraph,
} from "@/lib/fire-risk-assessments/parse";
