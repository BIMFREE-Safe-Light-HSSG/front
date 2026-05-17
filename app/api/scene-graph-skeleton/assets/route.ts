import { NextResponse } from "next/server"

import {
  addAssetToDocument,
  readSkeletonFile,
  removeAssetFromDocument,
  writeSkeletonFile,
} from "@/lib/scene-graph-skeleton/store"
import type { AssetStatus } from "@/lib/scene-graph-skeleton/types"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      class?: string
      position?: number[]
      status?: AssetStatus
      id?: string
    }

    let doc = await readSkeletonFile()
    const result = addAssetToDocument(doc, {
      class: body.class ?? "",
      position: body.position as [number, number, number],
      status: body.status,
      id: body.id,
    })
    doc = result.doc
    await writeSkeletonFile(doc)

    return NextResponse.json(doc, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id query is required" }, { status: 400 })
    }

    let doc = await readSkeletonFile()
    doc = removeAssetFromDocument(doc, id)
    await writeSkeletonFile(doc)

    return NextResponse.json(doc, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
