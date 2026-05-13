import { readFile } from "fs/promises"
import path from "path"

import { NextResponse } from "next/server"

export const runtime = "nodejs"

const SAMPLE_FILENAME = "processed_pointcloud.npy"

/**
 * 단일 데모 파일. 슬롯별 파일은 GET /api/pointcloud/:dataId (data1.npy …) 참고.
 */
export async function GET() {
  const filePath = path.join(process.cwd(), "app", "api", SAMPLE_FILENAME)
  try {
    const buffer = await readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=60",
      },
    })
  } catch {
    return NextResponse.json({ error: `Missing sample: app/api/${SAMPLE_FILENAME}` }, { status: 404 })
  }
}
