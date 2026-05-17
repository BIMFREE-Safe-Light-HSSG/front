"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { signup, type UserJob } from "@/app/api/auth"
import { BimFreeLogo } from "@/components/layout/bim-free-logo"
import { LiquidGlassPageShell } from "@/components/layout/liquid-glass-page-shell"
import { LiquidGlassSectionHeader } from "@/components/layout/liquid-glass-section-header"
import {
  KakaoLocationPicker,
  type SelectedKakaoLocation,
} from "@/components/kakao-location-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const fieldClass =
  "border-red-900/15 bg-white/50 text-zinc-900 placeholder:text-zinc-500 shadow-none focus-visible:border-red-900/30 focus-visible:ring-red-900/20 dark:text-zinc-900 dark:placeholder:text-zinc-500"

const jobButtonClass = (active: boolean) =>
  `h-11 rounded-full border text-xs font-bold tracking-[0.2em] uppercase transition-colors ${
    active
      ? "border-red-900 bg-red-950 text-white shadow-sm"
      : "border-red-900/15 bg-white/50 text-zinc-700 hover:border-red-900/30 hover:bg-white/80"
  }`

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [job, setJob] = useState<UserJob>("FACILITY_MANAGER")
  const [selectedLocation, setSelectedLocation] = useState<SelectedKakaoLocation>({
    latitude: 37.5665,
    longitude: 126.978,
  })
  const [confirmedLocation, setConfirmedLocation] = useState<SelectedKakaoLocation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const locationLabel = job === "FACILITY_MANAGER" ? "건물 위치" : "관할 지구"

  const parseLocation = () => {
    if (!Number.isFinite(selectedLocation.latitude) || !Number.isFinite(selectedLocation.longitude)) {
      throw new Error("지도에서 위치를 선택해주세요.")
    }
    return selectedLocation
  }

  const handleCheckLocation = () => {
    try {
      const location = parseLocation()
      if (job === "FACILITY_MANAGER" && !location.address && !location.placeName) {
        alert("건물 위치를 검색하거나 지도에서 선택해주세요.")
        return
      }
      if (job === "FIREFIGHTER" && !location.districtName && !location.region2DepthName) {
        alert("관할 지구를 확인할 수 있는 위치를 선택해주세요.")
        return
      }
      setConfirmedLocation(location)
    } catch (error) {
      console.error("좌표 확인 에러:", error)
      setConfirmedLocation(null)
      alert(error instanceof Error ? error.message : "좌표 확인에 실패했습니다.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const location = parseLocation()
      if (!confirmedLocation) {
        alert("위치 확인을 먼저 완료해주세요.")
        return
      }

      const locationName =
        location.districtName ?? location.region2DepthName ?? location.address ?? "관할 지구"

      await signup({
        name,
        email,
        password,
        job,
        ...(job === "FACILITY_MANAGER"
          ? {
              building_location: {
                latitude: location.latitude,
                longitude: location.longitude,
                place_name: location.placeName,
                address: location.address,
                provider: location.provider ?? "KAKAO",
                provider_place_id: location.providerPlaceId,
                district_code: location.districtCode,
                district_name: location.districtName,
                region_1depth_name: location.region1DepthName,
                region_2depth_name: location.region2DepthName,
                region_3depth_name: location.region3DepthName,
              },
            }
          : {
              jurisdiction: {
                code: location.districtCode,
                name: locationName,
                address: location.address,
                latitude: location.latitude,
                longitude: location.longitude,
                provider: location.provider ?? "KAKAO",
                provider_place_id: location.providerPlaceId,
                region_1depth_name: location.region1DepthName,
                region_2depth_name: location.region2DepthName,
                region_3depth_name: location.region3DepthName,
              },
            }),
      })

      alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.")
      router.push("/sign-in")
    } catch (error) {
      console.error("회원가입 에러:", error)
      alert("회원가입에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LiquidGlassPageShell maxWidth="xl" centered glassClassName="mx-auto">
      <BimFreeLogo className="mb-8" size="sm" />
      <LiquidGlassSectionHeader
        eyebrow="Registration"
        title={
          <>
            Create <span className="text-red-800/25 [-webkit-text-stroke:1px_#991b1b]">Account</span>
          </>
        }
        description="역할과 위치를 등록해 시설·응급 뷰어 접근 범위를 설정합니다."
      />

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-bold tracking-wide text-zinc-600 uppercase">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="홍길동"
            autoComplete="name"
            required
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold tracking-wide text-zinc-600 uppercase">직업</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setJob("FACILITY_MANAGER")
                setConfirmedLocation(null)
              }}
              className={jobButtonClass(job === "FACILITY_MANAGER")}
            >
              시설관리자
            </button>
            <button
              type="button"
              onClick={() => {
                setJob("FIREFIGHTER")
                setConfirmedLocation(null)
              }}
              className={jobButtonClass(job === "FIREFIGHTER")}
            >
              소방대원
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-bold tracking-wide text-zinc-600 uppercase">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-bold tracking-wide text-zinc-600 uppercase">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            className={fieldClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-red-900/10 bg-white/40 p-4 text-zinc-900 backdrop-blur-sm dark:text-zinc-900">
          <Label className="text-xs font-bold tracking-wide text-zinc-700 uppercase">{locationLabel}</Label>
          <KakaoLocationPicker
            variant="glass"
            label={locationLabel}
            latitude={selectedLocation.latitude}
            longitude={selectedLocation.longitude}
            onChange={(location) => {
              setSelectedLocation(location)
              setConfirmedLocation(null)
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleCheckLocation}
            className="h-10 w-full rounded-full border-red-900/20 bg-white/50 text-xs font-bold tracking-[0.2em] text-red-950 uppercase hover:bg-white/80"
          >
            위치 확인
          </Button>
          {confirmedLocation && (
            <div className="rounded-xl border border-red-900/10 bg-white/60 p-3 text-sm">
              <p className="font-semibold text-zinc-900 dark:text-zinc-900">
                {confirmedLocation.placeName ?? confirmedLocation.address ?? "주소 정보 없음"}
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-600">
                {confirmedLocation.address}
                {confirmedLocation.address ? " · " : ""}
                {confirmedLocation.region1DepthName} {confirmedLocation.region2DepthName}{" "}
                {confirmedLocation.region3DepthName}
                {confirmedLocation.districtName ? ` · ${confirmedLocation.districtName}` : ""}
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-full bg-red-950 text-xs font-black tracking-[0.25em] text-white uppercase hover:bg-black"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-red-900 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </LiquidGlassPageShell>
  )
}
