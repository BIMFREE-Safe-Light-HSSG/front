import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const FILTER_ID = "liquid-refraction-shell"

type LiquidGlassPageShellProps = {
  children: ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "5xl" | "full"
  glass?: boolean
  glassClassName?: string
  centered?: boolean
}

const maxWidthClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "5xl": "max-w-5xl",
  full: "max-w-full",
} as const

function GlassRim() {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[3rem] border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]" />
  )
}

export function LiquidGlassPageShell({
  children,
  className,
  maxWidth = "5xl",
  glass = true,
  glassClassName,
  centered = false,
}: LiquidGlassPageShellProps) {
  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden bg-[#fffafa] pt-28 pb-16 md:pt-32",
        centered && "flex flex-col items-center justify-center",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[10%] left-[10%] h-[500px] w-[500px] animate-blob rounded-full bg-orange-200/20 mix-blend-multiply blur-3xl filter" />
        <div className="animation-delay-2000 absolute top-[40%] right-[5%] h-[600px] w-[600px] animate-blob rounded-full bg-red-50/40 mix-blend-multiply blur-3xl filter" />
        <div className="animation-delay-4000 absolute bottom-[10%] left-[20%] h-[500px] w-[500px] animate-blob rounded-full bg-red-100/10 mix-blend-multiply blur-3xl filter" />
      </div>

      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
        <filter id={FILTER_ID}>
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves={3} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={20} />
        </filter>
      </svg>

      <div
        className={cn(
          "relative z-10 mx-auto flex w-full flex-col px-4",
          centered ? "items-center justify-center" : "items-stretch",
        )}
      >
        {glass ? (
          <div
            className={cn(
              "relative w-full rounded-[3rem] border border-white/50 bg-white/30 px-8 py-10 shadow-[0_25px_50px_-12px_rgba(220,38,38,0.1)] backdrop-blur-[30px] md:px-10 md:py-12",
              maxWidthClass[maxWidth],
              glassClassName,
            )}
            style={{
              backdropFilter: `blur(30px) url(#${FILTER_ID})`,
              WebkitBackdropFilter: `blur(30px) url(#${FILTER_ID})`,
            }}
          >
            <GlassRim />
            <div className="relative z-20">{children}</div>
          </div>
        ) : (
          <div className={cn("relative w-full", maxWidthClass[maxWidth])}>{children}</div>
        )}
      </div>
    </main>
  )
}
