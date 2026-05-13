import { readFile } from "fs/promises"
import path from "path"

import { NextResponse } from "next/server"

import { parseFacilityDataId } from "@/lib/facility-list-types"

/**
 * ─── API (예정) ─────────────────────────────────────────────────────────────
 *
 * GET /api/pointcloud/:dataId
 *   dataId ∈ { "1", "2", "3" } — 파일 경로: app/api/data{dataId}.npy
 *
 * 인증 (예정):
 *   Authorization: Bearer <access_token>
 *   서버에서 사용자 ID와 시설·dataId 접근 권한을 검증한 뒤 바이너리 반환.
 *
 * 응답 200:
 *   Content-Type: application/octet-stream
 *   Body: NumPy .npy 바이트 (행 [x,y,z,r,g,b,semantic_id] 등 로더와 맞는 형식)
 *
 * 응답 401: 미인증
 * 응답 403: 해당 dataId에 대한 권한 없음
 * 응답 404: 파일 없음 또는 잘못된 dataId
 *
 * 목록과의 연동 (예정):
 *   GET /api/facilities 가 내려준 각 항목의 `dataId`로 이 엔드포인트를 호출.
 *
 * 참고: 기존 샘플 단일 파일은 GET /api/pointcloud-sample (processed_pointcloud.npy)
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ dataId: string }> },
) {
  const { dataId } = await context.params
  if (!parseFacilityDataId(dataId)) {
    return NextResponse.json({ error: "Invalid dataId. Use 1, 2, or 3." }, { status: 404 })
  }

  const fileName = `data${dataId}.npy`
  const filePath = path.join(process.cwd(), "app", "api", fileName)
  try {
    const buffer = await readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=60",
      },
    })
  } catch {
    return NextResponse.json({ error: `Missing file: app/api/${fileName}` }, { status: 404 })
  }
}
