"use client";

import { motion } from "framer-motion";
import { MapPin, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_CLASS_STYLES } from "@/lib/scene-graph-skeleton/assets";
import {
  formatPositionComponent,
  parsePositionInput,
} from "@/lib/scene-graph-skeleton/coordinates";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";
import { cn } from "@/lib/utils";

const CLASS_OPTIONS = Object.keys(ASSET_CLASS_STYLES);
const DEFAULT_CLASS = CLASS_OPTIONS[0] ?? "etc";

type AssetEditorPanelProps = {
  open: boolean;
  placementMode: boolean;
  draftPosition: Vec3 | null;
  saving: boolean;
  onClose: () => void;
  onTogglePlacement: () => void;
  onPositionChange: (position: Vec3 | null) => void;
  onClassChange: (assetClass: string) => void;
  onSubmit: (payload: { class: string; position: Vec3 }) => void;
};

export function AssetEditorPanel({
  open,
  placementMode,
  draftPosition,
  saving,
  onClose,
  onTogglePlacement,
  onPositionChange,
  onClassChange,
  onSubmit,
}: AssetEditorPanelProps) {
  const [assetClass, setAssetClass] = useState(DEFAULT_CLASS);
  const [customClass, setCustomClass] = useState("");
  const [useCustomClass, setUseCustomClass] = useState(false);
  const [posX, setPosX] = useState("");
  const [posY, setPosY] = useState("");
  const [posZ, setPosZ] = useState("");

  useEffect(() => {
    if (!draftPosition) return;
    setPosX(formatPositionComponent(draftPosition[0]));
    setPosY(formatPositionComponent(draftPosition[1]));
    setPosZ(formatPositionComponent(draftPosition[2]));
  }, [draftPosition]);

  useEffect(() => {
    onClassChange(useCustomClass ? customClass.trim() || "etc" : assetClass);
  }, [assetClass, customClass, useCustomClass, onClassChange]);

  if (!open) return null;

  const resolvedClass = useCustomClass ? customClass.trim() : assetClass;

  const readPositionFromInputs = (): Vec3 | null => {
    const x = parsePositionInput(posX);
    const y = parsePositionInput(posY);
    const z = parsePositionInput(posZ);
    if (x === null || y === null || z === null) return null;
    return [x, y, z];
  };

  const handleApplyInputs = () => {
    const p = readPositionFromInputs();
    if (p) onPositionChange(p);
  };

  const handleSubmit = () => {
    const position = readPositionFromInputs();
    if (!resolvedClass || !position) return;
    onSubmit({ class: resolvedClass, position });
  };

  const canSubmit = Boolean(resolvedClass && readPositionFromInputs());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="border-t border-red-900/10 bg-gradient-to-b from-white/60 to-amber-50/25 px-4 py-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-widest text-zinc-800 uppercase">
          시설 등록
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-zinc-500">
            클래스
          </Label>
          {!useCustomClass ? (
            <Select value={assetClass} onValueChange={setAssetClass}>
              <SelectTrigger className="h-9 bg-white/70 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={customClass}
              onChange={(e) => setCustomClass(e.target.value)}
              placeholder="e.g. extinguisher"
              className="h-9 bg-white/70"
            />
          )}
          <button
            type="button"
            className="text-[10px] font-medium text-red-900/70 underline-offset-2 hover:underline"
            onClick={() => setUseCustomClass((v) => !v)}
          >
            {useCustomClass ? "목록에서 선택" : "직접 입력"}
          </button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-zinc-500">
            위치 (x, y, z) · 평면 xy + 수직 z
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={posX}
              onChange={(e) => setPosX(e.target.value)}
              placeholder="x"
              className="h-9 bg-white/70 font-mono text-xs"
            />
            <Input
              value={posY}
              onChange={(e) => setPosY(e.target.value)}
              placeholder="y"
              className="h-9 bg-white/70 font-mono text-xs"
            />
            <Input
              value={posZ}
              onChange={(e) => setPosZ(e.target.value)}
              placeholder="z"
              className="h-9 bg-white/70 font-mono text-xs"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={handleApplyInputs}
          >
            입력 좌표 미리보기 반영
          </Button>
        </div>

        <Button
          type="button"
          variant={placementMode ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 w-full gap-2 rounded-2xl text-xs",
            placementMode &&
              "bg-sky-700 shadow-md shadow-sky-900/20 hover:bg-sky-800",
          )}
          onClick={onTogglePlacement}
        >
          <MapPin className="h-3.5 w-3.5" />
          {placementMode ? "3D 지정 중… (바닥 클릭)" : "3D에서 위치 지정"}
        </Button>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            className="h-9 flex-1 gap-1.5 text-xs"
            disabled={!canSubmit || saving}
            onClick={handleSubmit}
          >
            <Plus className="h-3.5 w-3.5" />
            {saving ? "저장 중…" : "등록"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
