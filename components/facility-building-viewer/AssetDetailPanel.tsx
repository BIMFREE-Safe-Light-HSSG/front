"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ASSET_STATUS_LABELS, assetClassStyle } from "@/lib/scene-graph-skeleton/assets";
import {
  formatInspectionDate,
  inspectionRecordsForAsset,
} from "@/lib/scene-graph-skeleton/inspection-history";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";
import { cn } from "@/lib/utils";

type AssetDetailPanelProps = {
  asset: FacilityAssetRef;
  onClose?: () => void;
  className?: string;
};

export function AssetDetailPanel({ asset, onClose, className }: AssetDetailPanelProps) {
  const style = assetClassStyle(asset.class);
  const records = inspectionRecordsForAsset(asset);
  const status = asset.status ? ASSET_STATUS_LABELS[asset.status] : null;

  return (
    <motion.div
      key={asset.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={cn("px-4 py-4", className)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          className="h-1 flex-1 origin-left rounded-full"
          style={{ backgroundColor: style.color }}
        />
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-xl text-zinc-500 hover:bg-white/80 hover:text-red-950"
            onClick={onClose}
            aria-label="시설 상세 닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-zinc-900">{asset.class}</p>
          <p className="font-mono text-[10px] text-zinc-500">{asset.id}</p>
        </div>
        {status ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.tone}`}
          >
            {status.label}
          </span>
        ) : null}
      </div>

      <dl className="mt-3 space-y-1.5 text-xs text-zinc-600">
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-400">위치 (x, y, z)</dt>
          <dd className="font-mono text-right text-zinc-800">
            {asset.position.map((value) => value.toFixed(2)).join(", ")}
          </dd>
        </div>
        {asset.zoneName ? (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">구역</dt>
            <dd className="text-right font-medium text-zinc-800">{asset.zoneName}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4">
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">관리 기록</p>
        <ul className="mt-2 space-y-2">
          {records.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-red-900/15 bg-white/50 px-3 py-6 text-center text-xs text-zinc-500">
              이 시설에 등록된 점검 이력이 없습니다.
            </li>
          ) : (
            records.map((row, index) => (
              <motion.li
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.06 }}
                className="rounded-2xl border border-red-900/10 bg-white/70 px-3 py-2.5 text-xs shadow-sm"
              >
                <p className="font-medium text-zinc-800">{row.action}</p>
                <p className="text-muted-foreground mt-0.5">
                  {formatInspectionDate(row.date)} · {row.result}
                </p>
                {row.inspector ? (
                  <p className="text-muted-foreground mt-1 font-mono text-[10px]">{row.inspector}</p>
                ) : null}
              </motion.li>
            ))
          )}
        </ul>
      </div>
    </motion.div>
  );
}
