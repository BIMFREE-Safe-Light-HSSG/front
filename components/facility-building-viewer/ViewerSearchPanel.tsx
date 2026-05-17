"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

import {
  ViewerFilterChip,
  viewerGlass,
  viewerType,
} from "@/components/facility-building-viewer/viewer-design";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_STATUS_LABELS } from "@/lib/scene-graph-skeleton/assets";
import type {
  ViewerSearchFilters,
  ViewerSearchResult,
} from "@/lib/scene-graph-skeleton/search";
import {
  DEFAULT_VIEWER_SEARCH_FILTERS,
  hasActiveViewerSearch,
} from "@/lib/scene-graph-skeleton/search";
import type { AssetStatus, ZoneNode } from "@/lib/scene-graph-skeleton/types";
import { cn } from "@/lib/utils";

const ENTITY_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "zones", label: "구역만" },
  { value: "assets", label: "시설만" },
] as const;

const STATUS_OPTIONS: AssetStatus[] = [
  "normal",
  "inspection_due",
  "fault",
  "offline",
];

const fieldClass =
  "h-9 border-red-900/12 bg-white/75 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400";

type ViewerSearchPanelProps = {
  open: boolean;
  filters: ViewerSearchFilters;
  results: ViewerSearchResult[];
  zones: ZoneNode[];
  assetClasses: string[];
  onClose: () => void;
  onFiltersChange: (filters: ViewerSearchFilters) => void;
  onSelectResult: (result: ViewerSearchResult) => void;
};

export function ViewerSearchPanel({
  open,
  filters,
  results,
  zones,
  assetClasses,
  onClose,
  onFiltersChange,
  onSelectResult,
}: ViewerSearchPanelProps) {
  const active = hasActiveViewerSearch(filters);

  const toggleClass = (cls: string) => {
    const set = new Set(filters.assetClasses);
    if (set.has(cls)) set.delete(cls);
    else set.add(cls);
    onFiltersChange({ ...filters, assetClasses: [...set] });
  };

  const toggleStatus = (status: AssetStatus) => {
    const set = new Set(filters.assetStatuses);
    if (set.has(status)) set.delete(status);
    else set.add(status);
    onFiltersChange({ ...filters, assetStatuses: [...set] });
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="검색 패널 닫기"
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
              "absolute inset-y-0 right-0 z-30 flex w-[min(100%,340px)] flex-col border-l border-white/70",
              viewerGlass.overlayLight,
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-red-900/10 bg-gradient-to-r from-white/50 to-red-50/30 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-950/10 text-red-900">
                  <Search className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-zinc-900">
                    검색 · 필터
                  </h2>
                  <p className={cn(viewerType.mono, "text-zinc-500")}>
                    구역·시설 하이라이트
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

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-4">
                <FilterBlock label="키워드">
                  <Input
                    value={filters.query}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, query: e.target.value })
                    }
                    placeholder="이름, ID, 클래스…"
                    className={fieldClass}
                  />
                </FilterBlock>

                <FilterBlock label="대상">
                  <Select
                    value={filters.entityType}
                    onValueChange={(v) =>
                      onFiltersChange({
                        ...filters,
                        entityType: v as ViewerSearchFilters["entityType"],
                      })
                    }
                  >
                    <SelectTrigger className={fieldClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterBlock>

                {(filters.entityType === "all" ||
                  filters.entityType === "assets") && (
                  <FilterBlock label="구역 (시설 한정)">
                    <Select
                      value={filters.zoneId ?? "__all__"}
                      onValueChange={(v) =>
                        onFiltersChange({
                          ...filters,
                          zoneId: v === "__all__" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="전체 구역" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">전체 구역</SelectItem>
                        {zones.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterBlock>
                )}

                {(filters.entityType === "all" ||
                  filters.entityType === "assets") &&
                assetClasses.length > 0 ? (
                  <FilterBlock label="시설 클래스">
                    <div className="flex flex-wrap gap-1.5">
                      {assetClasses.map((cls) => (
                        <ViewerFilterChip
                          key={cls}
                          active={filters.assetClasses.includes(cls)}
                          label={cls}
                          onClick={() => toggleClass(cls)}
                        />
                      ))}
                    </div>
                  </FilterBlock>
                ) : null}

                {filters.entityType === "all" ||
                filters.entityType === "assets" ? (
                  <FilterBlock label="상태">
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((status) => (
                        <ViewerFilterChip
                          key={status}
                          active={filters.assetStatuses.includes(status)}
                          label={ASSET_STATUS_LABELS[status].label}
                          onClick={() => toggleStatus(status)}
                        />
                      ))}
                    </div>
                  </FilterBlock>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full rounded-xl border-red-900/15 bg-white/50 text-xs text-zinc-600 hover:bg-white/90"
                  onClick={() => onFiltersChange(DEFAULT_VIEWER_SEARCH_FILTERS)}
                >
                  필터 초기화
                </Button>
              </div>
            </ScrollArea>

            <div className="border-t border-red-900/10 bg-white/40 p-3">
              <p className={cn(viewerType.eyebrow, "mb-2")}>
                결과 {active ? results.length : "—"}
              </p>
              <ul className="max-h-52 space-y-1 overflow-y-auto">
                {!active ? (
                  <li className={cn(viewerType.muted, "px-2 py-6 text-center")}>
                    조건을 입력하세요
                  </li>
                ) : results.length === 0 ? (
                  <li className={cn(viewerType.muted, "px-2 py-6 text-center")}>
                    일치 항목 없음
                  </li>
                ) : (
                  results.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => onSelectResult(r)}
                        className="w-full rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-red-950/8 hover:ring-1 hover:ring-red-900/15"
                      >
                        <span
                          className={cn(viewerType.eyebrow, "text-red-800/60")}
                        >
                          {r.kind === "zone" ? "구역" : "시설"}
                        </span>
                        <p className="text-sm font-semibold text-zinc-900">
                          {r.title}
                        </p>
                        <p className={cn(viewerType.mono, "text-zinc-500")}>
                          {r.subtitle}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function FilterBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={viewerType.eyebrow}>{label}</Label>
      {children}
    </div>
  );
}
