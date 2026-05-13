import Link from "next/link"
import { Gem } from "lucide-react"

import { cn } from "@/lib/utils"

type BimFreeLogoProps = {
  className?: string
  size?: "sm" | "md"
}

export function BimFreeLogo({ className, size = "md" }: BimFreeLogoProps) {
  const titleClass = size === "sm" ? "text-lg" : "text-2xl"
  const subClass = size === "sm" ? "text-[10px]" : "text-[12px]"

  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)}>
      <LogoMark titleClass={titleClass} subClass={subClass} />
    </Link>
  )
}

function LogoMark({ titleClass, subClass }: { titleClass: string; subClass: string }) {
  return (
    <div className="flex flex-col justify-center leading-none">
      <span
        className={cn(
          "font-display font-bold tracking-tight text-zinc-900 transition-colors group-hover:text-red-600",
          titleClass,
        )}
      >
        BIM-Free
      </span>
      <div className="flex items-start">
        <span className={cn("font-display tracking-tighter text-red-900/60", subClass)}>Safe(Light)HSSG</span>
        <Gem size={8} className="ml-1 mt-0.5 text-red-600 opacity-40" />
      </div>
    </div>
  )
}
