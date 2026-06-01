"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Building2, Database, UploadCloud, User } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/facility", label: "시설 관리", icon: Database },
  { href: "/upload", label: "스캔 업로드", icon: UploadCloud },
  { href: "/my-page", label: "마이페이지", icon: User },
] as const;

type FacilityShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
};

export function FacilityShell({
  children,
  eyebrow = "Facility Workspace",
  title = "FACILITY MANAGEMENT",
}: FacilityShellProps) {
  const pathname = usePathname();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffafa] px-4 py-8 text-zinc-950 sm:px-6">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-[8%] top-[16%] h-[420px] w-[420px] rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute right-[10%] top-[24%] h-[520px] w-[520px] rounded-full bg-red-100/50 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-950 text-white shadow-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-red-900/50">
                SuperSafeTwin
              </p>
              <p className="text-sm text-zinc-500">{eyebrow}</p>
            </div>
          </Link>

          <nav className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors",
                    active
                      ? "border-red-900/30 bg-red-950 text-white"
                      : "border-red-900/10 bg-white/40 text-zinc-600 hover:bg-white/70",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        {title ? (
          <h1 className="mb-8 font-display text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">
            {title}
          </h1>
        ) : null}

        {children}
      </div>
    </main>
  );
}
