"use client"; // 1. 클라이언트 컴포넌트 선언

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup, type UserJob } from "@/app/api/auth";
import {
  KakaoLocationPicker,
  type SelectedKakaoLocation,
} from "@/components/kakao-location-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  // 2. 상태 관리 변수 설정 (이름, 이메일, 비밀번호)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [job, setJob] = useState<UserJob>("FACILITY_MANAGER");
  const [selectedLocation, setSelectedLocation] = useState<SelectedKakaoLocation>({
    latitude: 37.5665,
    longitude: 126.978,
  });
  const [confirmedLocation, setConfirmedLocation] = useState<SelectedKakaoLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const locationLabel = job === "FACILITY_MANAGER" ? "건물 위치" : "관할 지구";

  const parseLocation = () => {
    if (!Number.isFinite(selectedLocation.latitude) || !Number.isFinite(selectedLocation.longitude)) {
      throw new Error("지도에서 위치를 선택해주세요.");
    }

    return selectedLocation;
  };

  const handleCheckLocation = () => {
    try {
      const location = parseLocation();
      if (job === "FACILITY_MANAGER" && !location.address && !location.placeName) {
        alert("건물 위치를 검색하거나 지도에서 선택해주세요.");
        return;
      }

      if (job === "FIREFIGHTER" && !location.districtName && !location.region2DepthName) {
        alert("관할 지구를 확인할 수 있는 위치를 선택해주세요.");
        return;
      }

      setConfirmedLocation(location);
    } catch (error) {
      console.error("좌표 확인 에러:", error);
      setConfirmedLocation(null);
      alert(error instanceof Error ? error.message : "좌표 확인에 실패했습니다.");
    }
  };

  // 3. 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const location = parseLocation();
      if (!confirmedLocation) {
        alert("위치 확인을 먼저 완료해주세요.");
        return;
      }

      const locationName = location.districtName ?? location.region2DepthName ?? location.address ?? "관할 지구";
      const result = await signup({
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
      });
      console.log("회원가입 성공:", result);
      
      alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      router.push("/sign-in"); // 가입 성공 후 로그인 페이지로 이동
    } catch (error: any) {
      console.error("회원가입 에러:", error);
      alert("회원가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-8 py-28">
        {/* Header */}
        <div className="space-y-2">
          <a href="/" className="inline-flex items-center gap-2 mb-8 group">
            <span className="font-display text-xl tracking-tight">BIMFree</span>
            <span className="text-muted-foreground font-mono text-[10px] mt-0.5">HOME</span>
          </a>
          <h1 className="text-2xl font-display tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">역할과 위치를 등록해 뷰어 접근 범위를 설정합니다.</p>
        </div>

        {/* 4. form에 onSubmit 연결 */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              required
              // 5. value와 onChange 연결
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>직업</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setJob("FACILITY_MANAGER");
                  setConfirmedLocation(null);
                }}
                className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                  job === "FACILITY_MANAGER"
                    ? "border-red-900 bg-red-950 text-white"
                    : "border-input bg-background hover:bg-muted"
                }`}
              >
                시설관리자
              </button>
              <button
                type="button"
                onClick={() => {
                  setJob("FIREFIGHTER");
                  setConfirmedLocation(null);
                }}
                className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                  job === "FIREFIGHTER"
                    ? "border-red-900 bg-red-950 text-white"
                    : "border-input bg-background hover:bg-muted"
                }`}
              >
                소방대원
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              // 5. value와 onChange 연결
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              // 5. value와 onChange 연결
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label>{locationLabel}</Label>
            </div>
            <KakaoLocationPicker
              label={locationLabel}
              latitude={selectedLocation.latitude}
              longitude={selectedLocation.longitude}
              onChange={(location) => {
                setSelectedLocation(location);
                setConfirmedLocation(null);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCheckLocation}
              className="w-full"
            >
              위치 확인
            </Button>
            {confirmedLocation && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">
                  {confirmedLocation.placeName ?? confirmedLocation.address ?? "주소 정보 없음"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {confirmedLocation.address}
                  {confirmedLocation.address ? " · " : ""}
                  {confirmedLocation.region1DepthName} {confirmedLocation.region2DepthName}{" "}
                  {confirmedLocation.region3DepthName}
                  {" · "}
                  {confirmedLocation.districtName}
                </p>
              </div>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-11"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/sign-in" className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
