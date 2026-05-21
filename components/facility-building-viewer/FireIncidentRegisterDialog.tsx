"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { FireSeverity } from "@/lib/fire-incidents/types";
import { cn } from "@/lib/utils";

const SEVERITY_OPTIONS: { value: FireSeverity; label: string }[] = [
  { value: "low", label: "낮음" },
  { value: "medium", label: "보통" },
  { value: "high", label: "높음" },
];

type FireIncidentRegisterDialogProps = {
  open: boolean;
  zoneName?: string | null;
  submitting?: boolean;
  onConfirm: (payload: { severity: FireSeverity; note: string }) => void;
  onCancel: () => void;
};

export function FireIncidentRegisterDialog({
  open,
  zoneName,
  submitting = false,
  onConfirm,
  onCancel,
}: FireIncidentRegisterDialogProps) {
  const [severity, setSeverity] = useState<FireSeverity>("high");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setSeverity("high");
      setNote("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-md border-red-900/15 bg-white/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-900">
            <Flame className="h-5 w-5" />
            화재 위치 등록
          </DialogTitle>
          <DialogDescription>
            {zoneName ? `${zoneName} · ` : ""}
            선택한 위치에 화재 정보를 입력하세요. 관할 소방 계정에 알림이 전송됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              심각도
            </Label>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => setSeverity(option.value)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                    severity === option.value
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-red-900/15 bg-white text-zinc-700 hover:bg-red-50",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fire-note" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              메모
            </Label>
            <textarea
              id="fire-note"
              value={note}
              disabled={submitting}
              onChange={(event) => setNote(event.target.value)}
              placeholder="예: 3층 복도 연기 확인, 인명 대피 필요"
              rows={4}
              className="w-full resize-none rounded-xl border border-red-900/15 bg-white/80 px-3 py-2 text-sm text-zinc-900 outline-none ring-red-500/30 focus:ring-2"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
            취소
          </Button>
          <Button
            type="button"
            disabled={submitting}
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => onConfirm({ severity, note: note.trim() })}
          >
            {submitting ? "등록 중…" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
