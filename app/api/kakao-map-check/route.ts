import { NextResponse } from "next/server"

import { probeKakaoMapsSdk } from "@/lib/kakao-map-sdk"

export async function GET() {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY?.trim()

  if (!appKey) {
    return NextResponse.json({
      ok: false,
      message: "NEXT_PUBLIC_KAKAO_MAP_JS_KEY가 설정되지 않았습니다.",
    })
  }

  const result = await probeKakaoMapsSdk(appKey)
  return NextResponse.json(result)
}
