import { readFile } from "fs/promises"
import path from "path"

import { NextResponse } from "next/server"

import { parseFacilityDataId } from "@/lib/facility-list-types"

export const runtime = "nodejs"

/** GET /api/scene-graph/:dataId — facility HSSG sample (data1 → S3DIS conference room). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ dataId: string }> },
) {
  const { dataId } = await context.params
  if (!parseFacilityDataId(dataId)) {
    return NextResponse.json({ error: "Invalid dataId. Use 1, 2, or 3." }, { status: 404 })
  }

  const fileName = `data${dataId}.json`
  const filePath = path.join(process.cwd(), "app", "api", "scene-graph", fileName)
  try {
    const text = await readFile(filePath, "utf8")
    return new NextResponse(text, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    })
  } catch {
    return NextResponse.json(
      { error: `Missing scene graph: app/api/scene-graph/${fileName}` },
      { status: 404 },
    )
  }
}
