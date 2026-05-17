import Link from "next/link"

import { BuildingViewerShell } from "@/components/facility-building-viewer/BuildingViewerShell"
import { LiquidGlassPageShell } from "@/components/layout/liquid-glass-page-shell"
import { Button } from "@/components/ui/button"
import { parseFacilityDataId } from "@/lib/facility-list-types"

type PageProps = {
  params: Promise<{ dataId: string }>
}

export default async function FacilityViewerDetailPage({ params }: PageProps) {
  const { dataId: raw } = await params
  const dataId = parseFacilityDataId(raw ?? "")

  if (!dataId) {
    return (
      <LiquidGlassPageShell maxWidth="lg" glassClassName="mx-auto">
        <h1 className="text-xl font-bold text-zinc-900">시설을 찾을 수 없습니다</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          dataId &quot;{raw}&quot;는 등록되지 않았습니다.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/viewer">시설 목록으로</Link>
        </Button>
      </LiquidGlassPageShell>
    )
  }

  return <BuildingViewerShell dataId={dataId} />
}
