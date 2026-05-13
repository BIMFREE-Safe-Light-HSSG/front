"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { FacilitiesListResponse } from "@/lib/facility-list-types"

export function FacilityListPanel() {
  const [data, setData] = useState<FacilitiesListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  /** 시설 메타만 JSON으로 받음. 포인트 .npy는 `/viewer/[dataId]`에서만 요청합니다. */
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
    <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">시설 포인트 클라우드</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          관리 중인 시설을 선택하면 해당 데이터 슬롯의 포인트 클라우드를 봅니다. (현재는 샘플 목록·
          <code className="text-xs">/api/pointcloud/1~3</code> 연동)
        </p>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground text-sm">목록 불러오는 중…</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.facilities ?? []).map((f) => (
            <li key={f.id}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{f.name}</CardTitle>
                  {f.description ? <CardDescription>{f.description}</CardDescription> : null}
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-mono text-xs">
                    dataId: {f.dataId} · 시설 id: {f.id}
                  </p>
                </CardContent>
                <CardFooter>
                  <Link
                    prefetch={false}
                    href={`/viewer/${f.dataId}`}
                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                  >
                    뷰어 열기 →
                  </Link>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
