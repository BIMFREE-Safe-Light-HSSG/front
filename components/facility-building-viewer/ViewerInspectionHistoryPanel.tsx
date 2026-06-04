"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, X } from "lucide-react";

import { viewerGlass, viewerType } from "@/components/facility-building-viewer/viewer-design";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  collectBuildingInspectionHistory,
  formatInspectionDate,
  type InspectionRecord,
} from "@/lib/scene-graph-skeleton/inspection-history";
import type {
  AssetInspectionRecord,
  FacilityAssetRef,
} from "@/lib/scene-graph-skeleton/types";
import { cn } from "@/lib/utils";

type ViewerInspectionHistoryPanelProps = {
  open: boolean;
  buildingName?: string | null;
  assets: FacilityAssetRef[];
  selectedAssetId?: string | null;
  buildingInspectionHistory?: AssetInspectionRecord[];
  onClose: () => void;
  onSelectAsset?: (assetId: string) => void;
};

export function ViewerInspectionHistoryPanel({
  open,
  buildingName,
  assets,
  selectedAssetId = null,
  buildingInspectionHistory,
  onClose,
  onSelectAsset,
}: ViewerInspectionHistoryPanelProps) {
  const records = collectBuildingInspectionHistory(assets, buildingInspectionHistory);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="점검 이력 패널 닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-zinc-950/25 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%", opacity: 0.92 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn(
              "absolute inset-y-0 right-0 z-30 flex w-[min(100%,360px)] flex-col border-l border-white/70",
              viewerGlass.overlayLight,
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-red-900/10 bg-gradient-to-r from-white/50 to-red-50/30 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-950/10 text-red-900">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-zinc-900">건물 점검 이력</h2>
                  <p className={cn(viewerType.mono, "text-zinc-500")}>
                    {buildingName ?? "선택 건물"} · {records.length}건
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-zinc-500 hover:bg-white/80 hover:text-red-950"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className={cn(viewerType.muted, "border-b border-red-900/10 px-4 py-3")}>
              scene graph의 건물·시설 점검 이력입니다. 시설 행을 누르면 해당 시설을 선택하고,
              왼쪽 패널에서 관리 기록을 볼 수 있습니다.
            </p>

            <ScrollArea className="min-h-0 flex-1">
              <ul className="space-y-2 p-4">
                {records.length === 0 ? (
                  <li className={cn(viewerType.muted, "rounded-2xl bg-white/40 px-4 py-10 text-center")}>
                    표시할 점검 이력이 없습니다.
                  </li>
                ) : (
                  records.map((record) => (
                    <HistoryRow
                      key={record.id}
                      record={record}
                      selected={
                        Boolean(
                          selectedAssetId &&
                            record.assetId &&
                            record.assetId === selectedAssetId,
                        )
                      }
                      onSelectAsset={
                        record.assetId && onSelectAsset
                          ? () => onSelectAsset(record.assetId!)
                          : undefined
                      }
                    />
                  ))
                )}
              </ul>
            </ScrollArea>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function HistoryRow({
  record,
  selected = false,
  onSelectAsset,
}: {
  record: InspectionRecord;
  selected?: boolean;
  onSelectAsset?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">{record.action}</p>
        <time className={cn(viewerType.mono, "shrink-0 text-zinc-500")}>
          {formatInspectionDate(record.date)}
        </time>
      </div>
      <p className={cn(viewerType.muted, "mt-1")}>{record.result}</p>
      {record.assetLabel ? (
        <p className={cn(viewerType.mono, "mt-1.5 text-zinc-500")}>{record.assetLabel}</p>
      ) : null}
      {record.inspector ? (
        <span className={cn(viewerType.mono, "mt-2 inline-block rounded-full bg-white/70 px-2 py-0.5 text-zinc-600")}>
          {record.inspector}
        </span>
      ) : null}
    </>
  );

  const rowClass = cn(
    "w-full rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-colors",
    selected
      ? "border-red-600/35 bg-red-50/90 ring-2 ring-red-800/20"
      : "border-red-900/8 bg-white/55 hover:bg-red-950/6 hover:ring-1 hover:ring-red-900/15",
  );

  if (!onSelectAsset) {
    return (
      <li className={cn(rowClass, "block")}>{content}</li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onSelectAsset}
        className={rowClass}
      >
        {content}
      </button>
    </li>
  );
}
