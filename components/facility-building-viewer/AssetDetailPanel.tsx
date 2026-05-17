"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ASSET_STATUS_LABELS,
  assetClassStyle,
  placeholderMaintenanceRecords,
} from "@/lib/scene-graph-skeleton/assets";
import { confirmDeleteAsset } from "@/lib/scene-graph-skeleton/confirm-delete-asset";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";

type AssetDetailPanelProps = {
  asset: FacilityAssetRef;
  deleting?: boolean;
  onDelete: (id: string) => void;
};

export function AssetDetailPanel({
  asset,
  deleting,
  onDelete,
}: AssetDetailPanelProps) {
  const style = assetClassStyle(asset.class);
  const records = placeholderMaintenanceRecords(asset.id);
  const status = asset.status ? ASSET_STATUS_LABELS[asset.status] : null;

  return (
    <motion.div
      key={asset.id}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="border-t border-red-900/10 bg-gradient-to-b from-white/55 to-red-50/20 px-4 py-4"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        className="mb-3 h-1 origin-left rounded-full"
        style={{ backgroundColor: style.color }}
      />
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
            {asset.position.map((v) => v.toFixed(2)).join(", ")}
          </dd>
        </div>
        {asset.zoneName ? (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">구역</dt>
            <dd className="text-right font-medium text-zinc-800">
              {asset.zoneName}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4">
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
          관리 기록
        </p>
        <ul className="mt-2 space-y-2">
          {records.map((row, i) => (
            <motion.li
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06 }}
              className="rounded-2xl border border-red-900/10 bg-white/70 px-3 py-2.5 text-xs shadow-sm"
            >
              <p className="font-medium text-zinc-800">{row.action}</p>
              <p className="text-muted-foreground mt-0.5">
                {row.date} · {row.result}
              </p>
            </motion.li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-2 text-[10px]">
          API 연동 후 실제 점검·교체 이력이 표시됩니다.
        </p>
      </div>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="mt-4 h-9 w-full gap-1.5 text-xs"
        disabled={deleting}
        onClick={() => {
          if (confirmDeleteAsset(asset)) onDelete(asset.id);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleting ? "삭제 중…" : "시설 삭제"}
      </Button>
    </motion.div>
  );
}
