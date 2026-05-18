"use client";

import {
  Box,
  CircleDot,
  Crosshair,
  Home,
  Layers,
  MapPin,
  RotateCcw,
} from "lucide-react";
import type { ReactNode } from "react";

import type { ViewerLayerVisibility } from "@/components/facility-building-viewer/scene-camera-types";
import { viewerGlass } from "@/components/facility-building-viewer/viewer-design";
import { cn } from "@/lib/utils";

type ViewerCanvasNavBarProps = {
  layerVisibility: ViewerLayerVisibility;
  hasSelection: boolean;
  onResetView: () => void;
  onTopView: () => void;
  onIsoView: () => void;
  onFocusSelection: () => void;
  onToggleZones: () => void;
  onToggleAssets: () => void;
};

function NavBtn({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
        active
          ? "bg-red-950 text-white shadow-md shadow-red-900/25"
          : "text-zinc-600 hover:bg-white/90 hover:text-red-950",
      )}
    >
      {children}
    </button>
  );
}

function LayerToggle({
  active,
  label,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: typeof Box;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold tracking-wide transition-colors",
        active
          ? "bg-red-950/12 text-red-950 ring-1 ring-red-900/20"
          : "text-zinc-400 line-through decoration-zinc-400/80",
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </button>
  );
}

export function ViewerCanvasNavBar({
  layerVisibility,
  hasSelection,
  onResetView,
  onTopView,
  onIsoView,
  onFocusSelection,
  onToggleZones,
  onToggleAssets,
}: ViewerCanvasNavBarProps) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
      <nav
        className={cn(
          viewerGlass.overlayLight,
          "flex flex-wrap items-center gap-1 rounded-2xl p-1.5 shadow-lg",
        )}
        aria-label="3D 뷰어 내비게이션"
      >
        <NavBtn label="뷰 초기화" onClick={onResetView}>
          <Home className="h-4 w-4" />
        </NavBtn>
        <NavBtn label="상단 보기" onClick={onTopView}>
          <MapPin className="h-4 w-4" />
        </NavBtn>
        <NavBtn label="등각 보기" onClick={onIsoView}>
          <RotateCcw className="h-4 w-4" />
        </NavBtn>
        <NavBtn
          label="선택 항목으로 이동"
          onClick={onFocusSelection}
          active={hasSelection}
        >
          <Crosshair className="h-4 w-4" />
        </NavBtn>

        <span className="mx-0.5 h-6 w-px bg-red-900/15" aria-hidden />

        <div className="flex items-center gap-0.5 px-1">
          <Layers className="mr-0.5 h-3.5 w-3.5 text-red-800/50" aria-hidden />
          <LayerToggle
            active={layerVisibility.zones}
            label="구역"
            icon={Box}
            onClick={onToggleZones}
          />
          <LayerToggle
            active={layerVisibility.assets}
            label="시설"
            icon={CircleDot}
            onClick={onToggleAssets}
          />
        </div>
      </nav>
    </div>
  );
}
