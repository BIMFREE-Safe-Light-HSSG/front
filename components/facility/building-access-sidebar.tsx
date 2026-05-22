"use client";

import { useState } from "react";
import { Building2, Flame, Plus } from "lucide-react";

import { AddBuildingDialog } from "@/components/facility/add-building-dialog";
import { getBuildingActiveFireCount } from "@/lib/fire-incidents/building-list";
import type { ViewerBuilding } from "@/app/api/viewer";
import { cn } from "@/lib/utils";

type BuildingAccessSidebarProps = {
  buildings: ViewerBuilding[];
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string) => void;
  onBuildingAdded: (building: ViewerBuilding) => void;
  title?: string;
  className?: string;
};

export function BuildingAccessSidebar({
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  onBuildingAdded,
  title = "Building Access",
  className,
}: BuildingAccessSidebarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex flex-col rounded-[2rem] border border-white/60 bg-white/20 p-8",
          className,
        )}
        style={{ backdropFilter: "blur(20px)" }}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="font-black text-xs italic tracking-[0.3em] uppercase text-zinc-400">
            {title}
          </h3>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-900/15 bg-white/40 text-red-950 transition-colors hover:bg-red-950 hover:text-white"
            aria-label="건물 추가"
            title="건물 추가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto pr-1">
          {buildings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-red-900/15 bg-white/30 p-5 text-sm text-zinc-500">
              등록된 건물이 없습니다.
              <br />
              <span className="text-xs">우측 상단 + 버튼으로 건물을 추가하세요.</span>
            </div>
          ) : (
            buildings.map((building) => {
              const fireCount = getBuildingActiveFireCount(building);
              return (
                <button
                  key={building.id}
                  type="button"
                  onClick={() => onSelectBuilding(building.id)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-all",
                    selectedBuildingId === building.id
                      ? "border-red-900/40 bg-white/60 shadow-sm"
                      : fireCount > 0
                        ? "border-red-500/35 bg-red-50/40 hover:bg-red-50/60"
                        : "border-red-900/10 bg-white/20 hover:bg-white/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-red-900/50" />
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {fireCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-2 py-1 font-mono text-[9px] font-bold text-white">
                          <Flame className="h-2.5 w-2.5" />
                          화재 {fireCount}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 font-mono text-[9px]",
                          building.has_scene_graph
                            ? "bg-red-950 text-white"
                            : "bg-red-900/10 text-red-900/50",
                        )}
                      >
                        {building.has_scene_graph ? "GRAPH" : "EMPTY"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-bold text-zinc-900">{building.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {building.address ?? "주소 정보 없음"}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <AddBuildingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdded={onBuildingAdded}
      />
    </>
  );
}
