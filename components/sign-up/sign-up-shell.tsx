"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";

type SignUpShellProps = {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
  footer?: ReactNode;
};

const maxWidthClass = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
} as const;

export function SignUpShell({ children, maxWidth = "md", footer }: SignUpShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffafa] px-4 py-10 text-zinc-950 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-[6%] top-[12%] h-[380px] w-[380px] rounded-full bg-orange-200/35 blur-3xl" />
        <div className="absolute right-[8%] top-[20%] h-[460px] w-[460px] rounded-full bg-red-100/45 blur-3xl" />
        <div className="absolute bottom-[8%] left-[24%] h-[360px] w-[360px] rounded-full bg-red-200/25 blur-3xl" />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto w-full space-y-8",
          maxWidthClass[maxWidth],
        )}
      >
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-950 text-white shadow-lg shadow-red-950/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-red-900/50">
                SuperSafeTwin
              </p>
              <p className="text-sm text-zinc-500">Data To Safety</p>
            </div>
          </Link>
        </header>

        <div
          className="rounded-[2rem] border border-white/70 bg-white/45 p-6 shadow-[0_25px_50px_-12px_rgba(220,38,38,0.12)] backdrop-blur-[24px] sm:p-8"
          style={{
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {children}
        </div>

        {footer ? <div className="text-center text-sm text-zinc-500">{footer}</div> : null}
      </div>
    </main>
  );
}

export function SignUpStepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            index === current
              ? "w-8 bg-red-700"
              : index < current
                ? "w-2 bg-red-400"
                : "w-2 bg-red-200",
          )}
        />
      ))}
    </div>
  );
}
