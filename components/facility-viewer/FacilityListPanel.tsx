"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { LiquidGlassPageShell } from "@/components/layout/liquid-glass-page-shell"
import { LiquidGlassSectionHeader } from "@/components/layout/liquid-glass-section-header"
import type { FacilitiesListResponse } from "@/lib/facility-list-types"

export function FacilityListPanel() {
  const [data, setData] = useState<FacilitiesListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/facilities", { cache: "no-store", signal })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `${res.status}`)
    }
    return (await res.json()) as FacilitiesListResponse
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    load(ac.signal)
      .then(setData)
      .catch((e) => {
        if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
          return
        }
        setData(null)
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setLoading(false)
        }
      })
    return () => ac.abort()
  }, [load])

  return (
    <LiquidGlassPageShell maxWidth="5xl" glassClassName="mx-auto">
      <LiquidGlassSectionHeader
        eyebrow="Facility Registry"
        title={
          <>
            시설 <span className="text-red-800/25 [-webkit-text-stroke:1px_#991b1b]">Viewer</span>
          </>
        }
        description="계정에 연결된 시설을 선택하면 3D 외형·구역 대시보드 뷰어로 이동합니다."
      />

      {error ? (
        <p className="text-destructive mb-6 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase">Loading facilities…</p>
      ) : (data?.facilities ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">등록된 시설이 없습니다.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.facilities.map((f) => (
            <li key={f.id}>
              <Link
                prefetch={false}
                href={`/viewer/${f.dataId}`}
                className="group flex h-full flex-col rounded-3xl border border-red-900/10 bg-white/40 p-6 shadow-sm transition-all hover:border-red-500/30 hover:bg-white/60 hover:shadow-md"
              >
                <h2 className="text-lg font-black tracking-tight text-zinc-900 uppercase group-hover:text-red-950">
                  {f.name}
                </h2>
                {f.description ? (
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">{f.description}</p>
                ) : (
                  <div className="flex-1" />
                )}
                <p className="mt-4 font-mono text-[10px] tracking-wider text-red-900/50 uppercase">
                  dataId {f.dataId} · {f.id}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold tracking-widest text-red-950 uppercase">
                  Open viewer
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </LiquidGlassPageShell>
  )
}
