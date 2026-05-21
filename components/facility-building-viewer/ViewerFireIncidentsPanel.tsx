"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flame, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { viewerGlass, viewerType } from "@/components/facility-building-viewer/viewer-design";
import type { FireIncident } from "@/lib/fire-incidents/types";
import { formatViewerDateTime } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

const SEVERITY_LABEL = {
  low: "낮음",
  medium: "보통",
  high: "높음",
} as const;

type ViewerFireIncidentsPanelProps = {
  open: boolean;
  readOnly?: boolean;
  /** Activate Response 활성 — 별도 지정 버튼 없이 바닥 클릭으로 등록 */
  responseActive?: boolean;
  incidents: FireIncident[];
  selectedFireId: string | null;
  placementMode: boolean;
  onClose: () => void;
  onTogglePlacement: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export function ViewerFireIncidentsPanel({
  open,
  readOnly = false,
  responseActive = false,
  incidents,
  selectedFireId,
  placementMode,
  onClose,
  onTogglePlacement,
  onSelect,
  onRemove,
}: ViewerFireIncidentsPanelProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className={cn(
            "pointer-events-auto absolute bottom-16 left-3 z-20 flex max-h-[min(48%,380px)] w-[min(100%,300px)] flex-col overflow-hidden rounded-2xl shadow-xl",
            viewerGlass.overlayLight,
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-red-900/10 bg-gradient-to-r from-red-50/80 to-white/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600/15 text-red-700">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">화재 위치</h2>
                <p className={cn(viewerType.mono, "text-zinc-500")}>{incidents.length}건</p>
              </div>
            </div>
            {!responseActive ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={onClose}
                aria-label="화재 패널 닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          {!readOnly ? (
            <div className="border-b border-red-900/10 px-4 py-3">
              {responseActive ? (
                <p className={cn(viewerType.muted, "text-center text-xs leading-relaxed")}>
                  <span className="font-semibold text-red-800">Activate Response</span>가 켜져
                  있습니다. 3D 구역 바닥을 클릭해 화재 위치를 등록하세요. 종료하려면 페이지 상단
                  버튼을 다시 누르세요.
                </p>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    className={cn(
                      "h-9 w-full rounded-xl font-semibold",
                      placementMode
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-white/70 text-red-950 ring-1 ring-red-900/15 hover:bg-red-50",
                    )}
                    onClick={onTogglePlacement}
                  >
                    {placementMode ? "지정 완료 (클릭 종료)" : "3D 바닥에 화재 위치 지정"}
                  </Button>
                  <p className={cn(viewerType.muted, "mt-2 text-center")}>
                    {placementMode
                      ? "구역 바닥을 클릭하면 화재 지점이 추가됩니다."
                      : "버튼을 누른 뒤 뷰어에서 위치를 클릭하세요."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className={cn(viewerType.muted, "border-b border-red-900/10 px-4 py-3")}>
              시설관리자가 등록한 화재 위치입니다.
            </p>
          )}

          <ScrollArea className="min-h-0 flex-1">
            <ul className="space-y-2 p-3">
              {incidents.length === 0 ? (
                <li className={cn(viewerType.muted, "rounded-xl bg-white/40 px-3 py-8 text-center text-xs")}>
                  {readOnly ? "등록된 화재 위치가 없습니다." : "화재 위치를 지정해 주세요."}
                </li>
              ) : (
                incidents.map((incident) => (
                  <li key={incident.id}>
                    <div
                      className={cn(
                        "rounded-xl border px-3 py-2.5 transition-colors",
                        selectedFireId === incident.id
                          ? "border-red-500/50 bg-red-50/80 ring-1 ring-red-400/30"
                          : "border-red-900/10 bg-white/55 hover:bg-red-50/40",
                      )}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => onSelect(incident.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-red-800">
                            {SEVERITY_LABEL[incident.severity]}
                          </span>
                          <time className={cn(viewerType.mono, "text-[10px] text-zinc-500")}>
                            {formatViewerDateTime(incident.reported_at)}
                          </time>
                        </div>
                        <p className="mt-1 text-xs text-zinc-700">
                          {incident.zone_name ?? "구역 미지정"} · (
                          {incident.position.map((v) => v.toFixed(1)).join(", ")})
                        </p>
                        {incident.note ? (
                          <p className={cn(viewerType.muted, "mt-1 line-clamp-2")}>{incident.note}</p>
                        ) : null}
                      </button>
                      {!readOnly ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 w-full rounded-lg text-xs text-red-700 hover:bg-red-100/80"
                          onClick={() => onRemove(incident.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          삭제
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
