import { NextResponse } from "next/server"

import type { FacilitiesListResponse } from "@/lib/facility-list-types"

export const runtime = "nodejs"

export async function GET() {
  const body: FacilitiesListResponse = {
    facilities: [
      {
        id: "bld-001",
        name: "BLD_001 시설 외형",
        description: "scene_graph_skeleton.json 기반 ZONE·자산 3D 뷰",
        dataId: "1",
      },
    ],
  }
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  })
}
