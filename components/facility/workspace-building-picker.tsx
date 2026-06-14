"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Flame } from "lucide-react";

import type { ViewerBuilding } from "@/app/api/viewer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getBuildingActiveFireCount } from "@/lib/fire-incidents/building-list";
import { cn } from "@/lib/utils";

type WorkspaceBuildingPickerProps = {
  buildings: ViewerBuilding[];
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
};

export function WorkspaceBuildingPicker({
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  placeholder = "건물을 선택하세요",
  searchPlaceholder = "건물명·주소 검색",
  emptyLabel = "접근 가능한 건물이 없습니다.",
}: WorkspaceBuildingPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );

  if (buildings.length === 0) {
    return (
      <div className="rounded-xl border border-red-900/10 bg-white/30 p-5 text-sm text-zinc-500">
        {emptyLabel}
      </div>
    );
  }

  const selectedFireCount = selectedBuilding ? getBuildingActiveFireCount(selectedBuilding) : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="건물 선택"
          className={cn(
            "flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all",
            open
              ? "border-red-900/40 bg-white/70 shadow-sm"
              : "border-red-900/15 bg-white/40 hover:bg-white/60",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2.5">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-red-900/50" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-900">
                  {selectedBuilding?.name ?? placeholder}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                  {selectedBuilding?.address ?? "목록에서 건물을 선택하세요"}
                </p>
              </div>
            </div>
            {selectedBuilding ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-6">
                {selectedFireCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-2 py-1 font-mono text-[9px] font-bold text-white">
                    <Flame className="h-2.5 w-2.5" />
                    화재 {selectedFireCount}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "rounded-full px-2 py-1 font-mono text-[9px]",
                    selectedBuilding.has_scene_graph
                      ? "bg-red-950 text-white"
                      : "bg-red-900/10 text-red-900/50",
                  )}
                >
                  {selectedBuilding.has_scene_graph ? "GRAPH" : "EMPTY"}
                </span>
              </div>
            ) : null}
          </div>
          <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 text-red-900/40" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] border-red-900/10 bg-white/95 p-0 shadow-xl backdrop-blur-md"
      >
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} className="h-11" />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            <CommandGroup heading={`건물 ${buildings.length}곳`}>
              {buildings.map((building) => {
                const fireCount = getBuildingActiveFireCount(building);
                const isSelected = building.id === selectedBuildingId;

                return (
                  <CommandItem
                    key={building.id}
                    value={`${building.name} ${building.address ?? ""} ${building.district_name ?? ""}`}
                    onSelect={() => {
                      onSelectBuilding(building.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "cursor-pointer rounded-lg px-3 py-3 aria-selected:bg-red-50",
                      isSelected && "bg-red-50/80",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-red-900/45" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {building.name}
                          </p>
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-red-800" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                          {building.address ?? "주소 정보 없음"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {fireCount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-2 py-0.5 font-mono text-[9px] font-bold text-white">
                              <Flame className="h-2.5 w-2.5" />
                              화재 {fireCount}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[9px]",
                              building.has_scene_graph
                                ? "bg-red-950 text-white"
                                : "bg-red-900/10 text-red-900/50",
                            )}
                          >
                            {building.has_scene_graph ? "GRAPH" : "EMPTY"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
