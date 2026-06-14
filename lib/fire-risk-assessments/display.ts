import type { FireRiskSeverity } from "@/lib/fire-risk-assessments/types";

export const FIRE_RISK_SEVERITY_LABEL: Record<FireRiskSeverity, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "심각",
};

export const FIRE_RISK_SEVERITY_TONE: Record<FireRiskSeverity, string> = {
  LOW: "text-amber-800 bg-amber-500/15 ring-amber-400/30",
  MEDIUM: "text-orange-800 bg-orange-500/15 ring-orange-400/30",
  HIGH: "text-red-800 bg-red-500/15 ring-red-400/30",
  CRITICAL: "text-red-950 bg-red-600/20 ring-red-500/40",
};
