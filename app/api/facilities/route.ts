import { NextResponse } from "next/server"

import type { FacilitiesListResponse } from "@/lib/facility-list-types"

export const runtime = "nodejs"

/**
 * ─── API (예정) ─────────────────────────────────────────────────────────────
 *
 * GET /api/facilities
 *
 * 인증 (예정):
 *   Authorization: Bearer <access_token>
 *   또는 세션 쿠키. 서버에서 토큰으로 사용자 ID를 복원한 뒤, 해당 사용자에게 허용된 시설만 조회.
 *
 * 쿼리 (선택, 예정):
 *   ?userId=...  — 개발 전용; 프로덕션에서는 토큰만 사용.
 *
 * 응답 200:
 *   {
 *     "facilities": [
 *       { "id": "<uuid>", "name": "...", "description": "...", "dataId": "1" | "2" | "3" }
 *     ]
 *   }
 *
 * 응답 401: 미로그인 / 토큰 만료
 *
 * 포인트 바이너리는 별도:
 *   GET /api/pointcloud/:dataId  (아래 pointcloud 동적 라우트 참고)
 *
 * 현재: 샘플 JSON 3건 고정. 인증 없음. (이 핸들러는 디스크의 .npy를 읽지 않습니다.)
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function GET() {
  const body: FacilitiesListResponse = {
    facilities: [
      {
        id: "sample-facility-1",
        name: "시설 데이터 1",
        description: "포인트 클라우드 슬롯 1 (app/api/data1.npy)",
        dataId: "1",
      },
      {
        id: "sample-facility-2",
        name: "시설 데이터 2",
        description: "포인트 클라우드 슬롯 2 (app/api/data2.npy)",
        dataId: "2",
      },
      {
        id: "sample-facility-3",
        name: "시설 데이터 3",
        description: "포인트 클라우드 슬롯 3 (app/api/data3.npy)",
        dataId: "3",
      },
    ],
  }
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  })
}
