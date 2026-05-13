import type { ReactNode } from "react"
import { Compass } from "lucide-react"

import { cn } from "@/lib/utils"

type LiquidGlassSectionHeaderProps = {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  className?: string
}

export function LiquidGlassSectionHeader({
  eyebrow,
  title,
  description,
  className,
}: LiquidGlassSectionHeaderProps) {
  return (
    <header className={cn("mb-8 border-l-4 border-red-900 pl-6", className)}>
      <div className="mb-3 flex items-center gap-3">
        <Compass size={16} className="text-red-800/60" />
        <span className="font-mono text-[10px] font-bold tracking-[0.4em] text-red-900/40 uppercase">
          {eyebrow}
        </span>
      </div>
      <h1 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase md:text-4xl">{title}</h1>
      {description ? (
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">{description}</p>
      ) : null}
    </header>
  )
}
