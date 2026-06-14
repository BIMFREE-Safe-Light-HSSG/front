"use client";

import { Layers } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BuildingFloor } from "@/lib/scene-graph-skeleton/floors";
import { cn } from "@/lib/utils";

const ALL_FLOORS = "__all__";

type ViewerFloorSelectProps = {
  floors: BuildingFloor[];
  selectedFloorId: string | null;
  onSelectFloor: (floorId: string | null) => void;
  className?: string;
};

export function ViewerFloorSelect({
  floors,
  selectedFloorId,
  onSelectFloor,
  className,
}: ViewerFloorSelectProps) {
  if (floors.length <= 1) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-xl border border-white/20 bg-transparent px-2 py-1.5 backdrop-blur-sm",
        className,
      )}
    >
      <Layers className="h-3.5 w-3.5 shrink-0 text-white/55" aria-hidden />
      <Select
        value={selectedFloorId ?? ALL_FLOORS}
        onValueChange={(value) => {
          onSelectFloor(value === ALL_FLOORS ? null : value);
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label="층 선택"
          className="h-8 min-w-[7.5rem] border-0 bg-transparent px-2 text-xs font-semibold text-white shadow-none focus-visible:ring-0"
        >
          <SelectValue placeholder="층 선택" />
        </SelectTrigger>
        <SelectContent
          align="start"
          className="border-white/25 bg-transparent text-white shadow-lg backdrop-blur-xl"
        >
          <SelectItem
            value={ALL_FLOORS}
            className="text-xs text-white focus:bg-white/15 focus:text-white"
          >
            전체 층
          </SelectItem>
          {floors.map((floor) => (
            <SelectItem
              key={floor.id}
              value={floor.id}
              className="text-xs text-white focus:bg-white/15 focus:text-white"
            >
              {floor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
