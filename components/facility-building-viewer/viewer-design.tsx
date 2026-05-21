"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared glass surfaces aligned with LiquidGlassPageShell */
export const viewerGlass = {
  panel:
    "relative overflow-hidden rounded-3xl border border-white/55 bg-white/38 shadow-[0_20px_50px_-20px_rgba(153,27,27,0.18),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-2xl",
  panelRim:
    "pointer-events-none absolute inset-0 rounded-3xl border border-white/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.85)]",
  canvas:
    "relative overflow-hidden rounded-3xl border border-red-950/15 bg-gradient-to-br from-zinc-950 via-[#0f1419] to-zinc-950 shadow-[inset_0_2px_24px_rgba(0,0,0,0.55),0_24px_48px_-24px_rgba(127,29,29,0.35)]",
  canvasVignette:
    "pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(9,9,11,0.55)_100%)]",
  overlayLight:
    "border border-white/60 bg-white/92 text-zinc-900 shadow-[0_16px_40px_-12px_rgba(153,27,27,0.2)] backdrop-blur-xl",
  overlayDark:
    "border border-white/15 bg-zinc-950/88 text-white shadow-xl backdrop-blur-xl",
} as const;

export const viewerType = {
  eyebrow:
    "font-mono text-[10px] font-bold tracking-[0.32em] text-red-900/50 uppercase",
  sectionTitle: "text-xs font-bold tracking-[0.18em] text-zinc-800 uppercase",
  muted: "text-muted-foreground text-xs leading-relaxed",
  mono: "font-mono text-[10px] tracking-wide text-zinc-500",
} as const;

export function ViewerPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(viewerGlass.panel, className)}>
      <div className={viewerGlass.panelRim} aria-hidden />
      <div className="relative z-10 flex min-h-0 flex-col">{children}</div>
    </div>
  );
}

export function ViewerSegmentedTabs({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 border-b border-red-900/10 bg-gradient-to-b from-white/25 to-white/10 p-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ViewerTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-2xl px-3 py-2.5 text-xs font-bold tracking-widest uppercase transition-all duration-200",
        active
          ? "bg-white/85 text-red-950 shadow-sm ring-1 ring-red-900/15"
          : "text-zinc-500 hover:bg-white/45 hover:text-zinc-800",
      )}
    >
      {children}
    </button>
  );
}

export function ViewerStatPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <motion.div
      className={cn(
        viewerGlass.overlayLight,
        "min-w-[88px] rounded-2xl px-4 py-3 text-center",
      )}
      whileHover={{ y: -1 }}
    >
      <p className={viewerType.eyebrow}>{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-zinc-900">
        {value}
      </p>
    </motion.div>
  );
}

export function ViewerEntityButton({
  active,
  highlighted,
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
  className,
}: {
  active?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "w-full rounded-2xl px-3 py-2.5 text-left text-sm transition-all duration-200",
        active && "bg-red-950/12 text-red-950 ring-1 ring-red-900/25 shadow-sm",
        !active && highlighted && "bg-amber-400/15 ring-1 ring-amber-500/30",
        !active && !highlighted && "text-zinc-800 hover:bg-white/65",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ViewerFilterChip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-colors",
        active
          ? "bg-red-950 text-white shadow-md shadow-red-900/20"
          : "bg-white/55 text-zinc-600 ring-1 ring-red-900/8 hover:bg-white/80",
      )}
    >
      {color ? (
        <span
          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      {label}
    </motion.button>
  );
}

export function ViewerIconFab({
  active,
  onClick,
  label,
  icon: Icon,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200",
        viewerGlass.overlayLight,
        active
          ? "text-red-950 ring-2 ring-red-900/25"
          : "text-zinc-700 hover:text-red-950",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function ViewerCanvasBadge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "search" | "placement" | "fire";
  className?: string;
}) {
  const variants = {
    default: "bg-white/90 text-zinc-800 ring-1 ring-white/80",
    search: "bg-amber-100/95 text-amber-950 ring-1 ring-amber-400/50",
    placement: "bg-sky-100/95 text-sky-950 ring-1 ring-sky-400/50",
    fire: "bg-red-100/95 text-red-950 ring-1 ring-red-400/50",
  };
  return (
    <motion.span
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "pointer-events-none rounded-full px-3 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase shadow-lg backdrop-blur-md",
        variants[variant],
        className,
      )}
    >
      {children}
    </motion.span>
  );
}

export function ViewerSectionHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="border-b border-red-900/10 bg-white/20 px-4 py-3">
      <p className={viewerType.sectionTitle}>{title}</p>
      {hint ? <p className={cn(viewerType.muted, "mt-1")}>{hint}</p> : null}
    </div>
  );
}
