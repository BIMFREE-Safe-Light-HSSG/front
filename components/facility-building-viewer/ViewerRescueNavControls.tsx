"use client";

import { Loader2, MapPin, Route, UserRound } from "lucide-react";

import { viewerGlass } from "@/components/facility-building-viewer/viewer-design";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewerRescueNavControlsProps = {
  rescuerPlacementActive: boolean;
  victimPlacementActive: boolean;
  searchLoading: boolean;
  rescuerLabel: string | null;
  victimLabel: string | null;
  statusMessage: string | null;
  errorMessage: string | null;
  onToggleRescuerPlacement: () => void;
  onToggleVictimPlacement: () => void;
  onSearchPath: () => void;
};

export function ViewerRescueNavControls({
  rescuerPlacementActive,
  victimPlacementActive,
  searchLoading,
  rescuerLabel,
  victimLabel,
  statusMessage,
  errorMessage,
  onToggleRescuerPlacement,
  onToggleVictimPlacement,
  onSearchPath,
}: ViewerRescueNavControlsProps) {
  return (
    <div className="pointer-events-auto absolute bottom-[4.75rem] left-3 z-20 flex max-w-[min(100%-1.5rem,24rem)] flex-col gap-2">
      <div
        className={cn(
          viewerGlass.overlayLight,
          "flex flex-col gap-2 rounded-2xl p-2.5 shadow-lg",
        )}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={rescuerPlacementActive ? "default" : "outline"}
            className={cn(
              "h-8 gap-1.5 text-xs font-semibold",
              rescuerPlacementActive && "bg-blue-700 hover:bg-blue-800",
            )}
            onClick={onToggleRescuerPlacement}
          >
            <MapPin className="h-3.5 w-3.5" />
            소방대원 위치
          </Button>
          <Button
            type="button"
            size="sm"
            variant={victimPlacementActive ? "default" : "outline"}
            className={cn(
              "h-8 gap-1.5 text-xs font-semibold",
              victimPlacementActive && "bg-amber-600 hover:bg-amber-700",
            )}
            onClick={onToggleVictimPlacement}
          >
            <UserRound className="h-3.5 w-3.5" />
            피해자 위치
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-emerald-700 text-xs font-semibold hover:bg-emerald-800"
            disabled={searchLoading}
            onClick={onSearchPath}
          >
            {searchLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Route className="h-3.5 w-3.5" />
            )}
            구조 경로 탐색
          </Button>
        </div>

        {rescuerPlacementActive ? (
          <p className="text-[11px] leading-relaxed text-blue-900/80">
            3D 뷰에서 구역을 클릭해 소방대원 시작 위치를 지정하세요.
          </p>
        ) : null}

        {victimPlacementActive ? (
          <p className="text-[11px] leading-relaxed text-amber-900/80">
            3D 뷰에서 구역을 클릭해 피해자(occupant) 위치를 지정하세요.
          </p>
        ) : null}

        {rescuerLabel ? (
          <p className="text-[11px] font-medium text-zinc-700">소방대원: {rescuerLabel}</p>
        ) : null}

        {victimLabel ? (
          <p className="text-[11px] font-medium text-zinc-700">피해자: {victimLabel}</p>
        ) : null}

        {rescuerLabel ? (
          <p className="text-[11px] leading-relaxed text-emerald-800">{statusMessage}</p>
        ) : null}

        {errorMessage ? (
          <p className="text-[11px] leading-relaxed text-red-700">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
