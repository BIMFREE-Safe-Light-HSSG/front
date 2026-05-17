"use client";

import { motion } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";

import {
  ViewerEntityButton,
  ViewerFilterChip,
  ViewerSectionHeader,
  viewerType,
} from "@/components/facility-building-viewer/viewer-design";
import {
  ASSET_STATUS_LABELS,
  assetClassStyle,
  uniqueAssetClasses,
} from "@/lib/scene-graph-skeleton/assets";
import { confirmDeleteAsset } from "@/lib/scene-graph-skeleton/confirm-delete-asset";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";
import { cn } from "@/lib/utils";

type AssetListPanelProps = {
  assets: FacilityAssetRef[];
  classFilter: string | null;
  onClassFilterChange: (value: string | null) => void;
  selectedAssetId: string | null;
  hoveredAssetId: string | null;
  deletingAssetId: string | null;
  onSelectAsset: (id: string) => void;
  onHoverAsset: (id: string | null) => void;
  onDeleteAsset: (asset: FacilityAssetRef) => void;
};

export function AssetListPanel({
  assets,
  classFilter,
  onClassFilterChange,
  selectedAssetId,
  hoveredAssetId,
  deletingAssetId,
  onSelectAsset,
  onHoverAsset,
  onDeleteAsset,
}: AssetListPanelProps) {
  const classes = uniqueAssetClasses(assets);
  const filtered = classFilter
    ? assets.filter((a) => a.class === classFilter)
    : assets;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewerSectionHeader
        title="시설 목록"
        hint={
          classFilter
            ? `${classFilter} 필터 · ${filtered.length}건 · 삭제는 휴지통 또는 상세 패널`
            : "선택 후 삭제 · Delete 키 지원"
        }
      />
      <motion.div
        layout
        className="flex flex-wrap gap-1.5 border-b border-red-900/10 bg-white/15 px-2.5 py-2"
      >
        <ViewerFilterChip
          active={!classFilter}
          label="전체"
          onClick={() => onClassFilterChange(null)}
        />
        {classes.map((cls) => (
          <ViewerFilterChip
            key={cls}
            active={classFilter === cls}
            label={cls}
            color={assetClassStyle(cls).color}
            onClick={() =>
              onClassFilterChange(classFilter === cls ? null : cls)
            }
          />
        ))}
      </motion.div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5">
        {filtered.length === 0 ? (
          <li
            className={cn(
              viewerType.mono,
              "px-3 py-10 text-center text-zinc-400",
            )}
          >
            등록된 시설 없음
          </li>
        ) : (
          filtered.map((asset, index) => {
            const active = selectedAssetId === asset.id;
            const hovered = hoveredAssetId === asset.id;
            const deleting = deletingAssetId === asset.id;
            const style = assetClassStyle(asset.class);
            return (
              <motion.li
                key={asset.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.24) }}
                className="group relative"
              >
                <ViewerEntityButton
                  active={active}
                  highlighted={hovered}
                  onClick={() => onSelectAsset(asset.id)}
                  onMouseEnter={() => onHoverAsset(asset.id)}
                  onMouseLeave={() => onHoverAsset(null)}
                  className={cn(deleting && "opacity-60")}
                >
                  <span className="flex items-center gap-2 pr-8">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/70"
                      style={{ backgroundColor: style.color }}
                      aria-hidden
                    />
                    <span className="font-semibold">{asset.class}</span>
                    {asset.status ? (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-2 py-0.5 text-[9px] font-semibold",
                          ASSET_STATUS_LABELS[asset.status].tone,
                        )}
                      >
                        {ASSET_STATUS_LABELS[asset.status].label}
                      </span>
                    ) : null}
                  </span>
                  <span className={cn(viewerType.mono, "mt-1 block pl-[18px]")}>
                    {asset.id}
                  </span>
                </ViewerEntityButton>
                <button
                  type="button"
                  disabled={Boolean(deletingAssetId)}
                  aria-label={`${asset.class} 삭제`}
                  title="시설 삭제"
                  className={cn(
                    "absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border transition-all",
                    active || hovered
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                    deleting
                      ? "border-red-200 bg-red-50 text-red-400"
                      : "border-red-900/15 bg-white/90 text-zinc-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirmDeleteAsset(asset)) onDeleteAsset(asset);
                  }}
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </motion.li>
            );
          })
        )}
      </ul>
    </div>
  );
}
