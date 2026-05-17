export type KakaoSdkProbeResult =
  | { ok: true }
  | { ok: false; errorType?: string; message: string }

export function buildKakaoMapsSdkUrl(appKey: string) {
  const params = new URLSearchParams({
    appkey: appKey,
    libraries: "services",
    autoload: "false",
  })
  return `https://dapi.kakao.com/v2/maps/sdk.js?${params.toString()}`
}

export function formatKakaoSdkError(data: { errorType?: string; message?: string }): string {
  const message = data.message ?? ""

  if (message.includes("OPEN_MAP_AND_LOCAL")) {
    return [
      "카카오 앱에서 「지도/로컬」(OPEN_MAP_AND_LOCAL) 서비스가 꺼져 있습니다.",
      "developers.kakao.com → 앱 → 제품 설정에서 「지도/로컬」을 ON 한 뒤 저장하고,",
      "플랫폼 → Web에 http://localhost:3000 을 등록해 주세요.",
    ].join(" ")
  }

  if (data.errorType === "NotAuthorizedError") {
    return `카카오 Maps 인증 오류: ${message || "JavaScript 키와 Web 도메인을 확인하세요."}`
  }

  return message || "Kakao Maps SDK를 불러오지 못했습니다."
}

export async function probeKakaoMapsSdk(appKey: string): Promise<KakaoSdkProbeResult> {
  const response = await fetch(buildKakaoMapsSdkUrl(appKey), { cache: "no-store" })
  const text = await response.text()

  if (text.trimStart().startsWith("{")) {
    try {
      const data = JSON.parse(text) as { errorType?: string; message?: string }
      return { ok: false, errorType: data.errorType, message: formatKakaoSdkError(data) }
    } catch {
      return { ok: false, message: "Kakao Maps SDK 응답을 해석하지 못했습니다." }
    }
  }

  if (!response.ok) {
    return { ok: false, message: `Kakao Maps SDK HTTP ${response.status}` }
  }

  return { ok: true }
}
