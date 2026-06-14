"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Loader2, ShieldAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FIRE_RISK_SEVERITY_LABEL,
  FIRE_RISK_SEVERITY_TONE,
} from "@/lib/fire-risk-assessments/display";
import type { FireRiskAssessmentResult, FireRiskOverlay } from "@/lib/fire-risk-assessments/types";
import { formatViewerDateTime } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

type ViewerFireRiskPanelProps = {
  open: boolean;
  variant?: "popup" | "embedded";
  loading?: boolean;
  error?: string | null;
  result: FireRiskAssessmentResult | null;
  selectedRiskId: string | null;
  onClose: () => void;
  onSelectRisk: (overlay: FireRiskOverlay) => void;
  embeddedBackLabel?: string;
};

export function ViewerFireRiskPanel({
  open,
  variant = "popup",
  loading = false,
  error = null,
  result,
  selectedRiskId,
  onClose,
  onSelectRisk,
  embeddedBackLabel = "Building Access",
}: ViewerFireRiskPanelProps) {
  const risks = result?.fire_risks ?? [];
  const embedded = variant === "embedded";

  const panelBody = (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-red-900/10",
          embedded
            ? "mb-4 bg-transparent px-0 py-0"
            : "bg-gradient-to-r from-amber-50/80 to-white/60 px-5 py-3.5",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase text-zinc-400 italic">
              Fire Risk Check
            </h2>
            <p className="text-sm font-bold text-zinc-900">
              {loading ? "Gemini 분석 중…" : "취약점검"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("rounded-xl", embedded ? "h-9 gap-1.5 px-3 text-xs font-semibold" : "h-8 w-8")}
          onClick={onClose}
          aria-label={`${embeddedBackLabel}로 돌아가기`}
        >
          {embedded ? (
            <>
              <ArrowLeft className="h-4 w-4" />
              {embeddedBackLabel}
            </>
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-10">
          <Loader2 className="h-8 w-8 animate-spin text-red-900/50" />
          <p className="text-center text-sm leading-relaxed text-zinc-500">
            scene graph를 분석하고 있습니다.
            <br />
            완료될 때까지 잠시만 기다려 주세요.
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-8 text-center">
          <AlertTriangle className="h-7 w-7 text-red-600" />
          <p className="text-sm font-semibold text-zinc-800">분석에 실패했습니다</p>
          <p className="text-sm leading-relaxed text-zinc-500">{error}</p>
        </div>
      ) : (
        <>
          {result?.summary ? (
            <p className="mb-4 shrink-0 border-b border-red-900/10 pb-4 text-sm leading-relaxed text-zinc-600">
              {result.summary}
            </p>
          ) : null}

          <ScrollArea className="min-h-0 flex-1">
            <ul className="space-y-3 pr-1">
              {risks.length === 0 ? (
                <li className="rounded-xl border border-dashed border-red-900/15 bg-white/30 px-4 py-10 text-center text-sm text-zinc-500">
                  {result ? "표시할 취약 구역이 없습니다." : "점검 버튼을 눌러 분석을 시작하세요."}
                </li>
              ) : (
                risks.map((risk) => (
                  <li key={risk.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition-colors",
                        selectedRiskId === risk.id
                          ? "border-amber-500/50 bg-amber-50/80 ring-1 ring-amber-400/30"
                          : "border-red-900/10 bg-white/55 hover:bg-amber-50/40",
                      )}
                      onClick={() => onSelectRisk(risk)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-bold ring-1",
                            FIRE_RISK_SEVERITY_TONE[risk.severity],
                          )}
                        >
                          {FIRE_RISK_SEVERITY_LABEL[risk.severity]}
                        </span>
                        <span className="text-xs font-medium text-zinc-400">
                          신뢰 {Math.round(risk.confidence * 100)}%
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-zinc-900">
                        {risk.target_node_id}
                        {risk.category ? (
                          <span className="font-normal text-zinc-500"> · {risk.category}</span>
                        ) : null}
                      </p>
                      {risk.reason ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{risk.reason}</p>
                      ) : null}
                      {risk.recommendation ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-amber-900/80">
                          {risk.recommendation}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>

          {result?.created_at ? (
            <p className="mt-4 shrink-0 border-t border-red-900/10 pt-4 text-[11px] text-zinc-400 uppercase">
              Assessed {formatViewerDateTime(result.created_at)}
            </p>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    if (!open) return null;
    return <div className="flex min-h-0 flex-1 flex-col">{panelBody}</div>;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className={cn(
            "pointer-events-auto flex max-h-[min(52vh,420px)] w-full flex-col overflow-hidden rounded-[1.5rem]",
            "border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl",
          )}
        >
          {panelBody}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
