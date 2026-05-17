"use client";

import { AnimatePresence, motion } from "framer-motion";

import {
  viewerGlass,
  viewerType,
} from "@/components/facility-building-viewer/viewer-design";
import {
  ASSET_STATUS_LABELS,
  assetClassStyle,
} from "@/lib/scene-graph-skeleton/assets";
import type { FacilityAssetRef } from "@/lib/scene-graph-skeleton/types";
import { cn } from "@/lib/utils";

type AssetHoverTooltipProps = {
  asset: FacilityAssetRef | null;
  anchor: { x: number; y: number } | null;
};

export function AssetHoverTooltip({ asset, anchor }: AssetHoverTooltipProps) {
  const visible = Boolean(asset && anchor);

  return (
    <AnimatePresence>
      {visible && asset && anchor ? (
        <motion.div
          key={asset.id}
          role="tooltip"
          initial={{ opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className={cn(
            "pointer-events-none absolute z-20 max-w-[240px] rounded-2xl px-3.5 py-3 text-xs",
            viewerGlass.overlayLight,
          )}
          style={{ left: anchor.x + 16, top: anchor.y + 16 }}
        >
          <p className="text-sm font-bold tracking-tight text-zinc-900">
            {asset.class}
          </p>
          <p className={cn(viewerType.mono, "mt-0.5")}>{asset.id}</p>
          {asset.status ? (
            <span
              className={cn(
                "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                ASSET_STATUS_LABELS[asset.status].tone,
              )}
            >
              {ASSET_STATUS_LABELS[asset.status].label}
            </span>
          ) : null}
          <span
            className="mt-2.5 block h-1 w-full rounded-full"
            style={{ backgroundColor: assetClassStyle(asset.class).color }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
