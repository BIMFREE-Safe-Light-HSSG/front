import { NextResponse } from "next/server"

import { readSkeletonFile } from "@/lib/scene-graph-skeleton/store"

export const runtime = "nodejs"

export async function GET() {
  try {
    const body = await readSkeletonFile()
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
