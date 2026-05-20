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
import {
  DEFAULT_VIEWER_SEARCH_FILTERS,
  hasActiveViewerSearch,
  type ViewerSearchFilters,
  type ViewerSearchResult,
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

  const toggleClass = (assetClass: string) => {
    const set = new Set(filters.assetClasses);
    if (set.has(assetClass)) set.delete(assetClass);
    else set.add(assetClass);
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
                    검색 및 필터
                  </h2>
                  <p className={cn(viewerType.mono, "text-zinc-500")}>
                    구역과 시설을 찾습니다.
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
                    onChange={(event) =>
                      onFiltersChange({ ...filters, query: event.target.value })
                    }
                    placeholder="이름, ID, 시설 분류"
                    className={fieldClass}
                  />
                </FilterBlock>

                <FilterBlock label="대상">
                  <Select
                    value={filters.entityType}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        entityType: value as ViewerSearchFilters["entityType"],
                      })
                    }
                  >
                    <SelectTrigger className={fieldClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterBlock>

                {(filters.entityType === "all" ||
                  filters.entityType === "assets") && (
                  <FilterBlock label="구역">
                    <Select
                      value={filters.zoneId ?? "__all__"}
                      onValueChange={(value) =>
                        onFiltersChange({
                          ...filters,
                          zoneId: value === "__all__" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="전체 구역" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">전체 구역</SelectItem>
                        {zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterBlock>
                )}

                {(filters.entityType === "all" ||
                  filters.entityType === "assets") &&
                assetClasses.length > 0 ? (
                  <FilterBlock label="시설 분류">
                    <div className="flex flex-wrap gap-1.5">
                      {assetClasses.map((assetClass) => (
                        <ViewerFilterChip
                          key={assetClass}
                          active={filters.assetClasses.includes(assetClass)}
                          label={assetClass}
                          onClick={() => toggleClass(assetClass)}
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
                결과 {active ? results.length : "-"}
              </p>
              <ul className="max-h-52 space-y-1 overflow-y-auto">
                {!active ? (
                  <li className={cn(viewerType.muted, "px-2 py-6 text-center")}>
                    조건을 입력하세요.
                  </li>
                ) : results.length === 0 ? (
                  <li className={cn(viewerType.muted, "px-2 py-6 text-center")}>
                    일치 항목이 없습니다.
                  </li>
                ) : (
                  results.map((result) => (
                    <li key={`${result.kind}-${result.id}`}>
                      <button
                        type="button"
                        onClick={() => onSelectResult(result)}
                        className="w-full rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-red-950/8 hover:ring-1 hover:ring-red-900/15"
                      >
                        <span className={cn(viewerType.eyebrow, "text-red-800/60")}>
                          {result.kind === "zone" ? "구역" : "시설"}
                        </span>
                        <p className="text-sm font-semibold text-zinc-900">
                          {result.title}
                        </p>
                        <p className={cn(viewerType.mono, "text-zinc-500")}>
                          {result.subtitle}
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
