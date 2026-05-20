"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBuilding } from "@/app/api/viewer";
import {
  signin,
  signup,
  type BuildingLocationPayload,
  type UserJob,
} from "@/app/api/auth";
import {
  KakaoLocationPicker,
  type SelectedKakaoLocation,
} from "@/components/kakao-location-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BuildingDraft = {
  id: string;
  location: SelectedKakaoLocation;
};

const DEFAULT_LOCATION: SelectedKakaoLocation = {
  latitude: 37.5665,
  longitude: 126.978,
};

const createDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
};

const toBuildingLocationPayload = (
  location: SelectedKakaoLocation
): BuildingLocationPayload => ({
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
});

const getLocationTitle = (location: SelectedKakaoLocation) => {
  const region = [location.region1DepthName, location.region2DepthName, location.region3DepthName]
    .filter(Boolean)
    .join(" ");

  return (
    location.placeName ||
    location.address ||
    region ||
    `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
  );
};

const getLocationDetail = (location: SelectedKakaoLocation) => {
  const region = [location.region1DepthName, location.region2DepthName, location.region3DepthName]
    .filter(Boolean)
    .join(" ");

  return [location.address, region, location.districtName].filter(Boolean).join(" · ");
};

const isSameBuildingLocation = (
  left: SelectedKakaoLocation,
  right: SelectedKakaoLocation
) => {
  if (left.providerPlaceId && right.providerPlaceId) {
    return left.providerPlaceId === right.providerPlaceId;
  }

  return (
    left.latitude.toFixed(6) === right.latitude.toFixed(6) &&
    left.longitude.toFixed(6) === right.longitude.toFixed(6)
  );
};

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [job, setJob] = useState<UserJob>("FACILITY_MANAGER");
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedKakaoLocation>(DEFAULT_LOCATION);
  const [confirmedLocation, setConfirmedLocation] =
    useState<SelectedKakaoLocation | null>(null);
  const [buildingDrafts, setBuildingDrafts] = useState<BuildingDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const locationLabel = job === "FACILITY_MANAGER" ? "건물 위치" : "관할 지구";

  const parseLocation = () => {
    if (
      !Number.isFinite(selectedLocation.latitude) ||
      !Number.isFinite(selectedLocation.longitude)
    ) {
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

      if (
        job === "FIREFIGHTER" &&
        !location.districtName &&
        !location.region2DepthName
      ) {
        alert("관할 지구를 확인할 수 있는 위치를 선택해주세요.");
        return;
      }

      setConfirmedLocation(location);
    } catch (error) {
      console.error("Location check error:", error);
      setConfirmedLocation(null);
      alert(error instanceof Error ? error.message : "위치 확인에 실패했습니다.");
    }
  };

  const handleAddBuildingDraft = () => {
    if (!confirmedLocation) {
      alert("건물 위치 확인을 먼저 완료해주세요.");
      return;
    }

    if (
      buildingDrafts.some((draft) =>
        isSameBuildingLocation(draft.location, confirmedLocation)
      )
    ) {
      alert("이미 추가된 건물 위치입니다.");
      return;
    }

    setBuildingDrafts((current) => [
      ...current,
      {
        id: createDraftId(),
        location: confirmedLocation,
      },
    ]);
    setConfirmedLocation(null);
  };

  const handleRemoveBuildingDraft = (buildingDraftId: string) => {
    setBuildingDrafts((current) =>
      current.filter((building) => building.id !== buildingDraftId)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (job === "FACILITY_MANAGER" && buildingDrafts.length === 0) {
        alert("관리할 건물을 1개 이상 추가해주세요.");
        return;
      }

      if (job === "FIREFIGHTER" && !confirmedLocation) {
        alert("관할 지구 위치 확인을 먼저 완료해주세요.");
        return;
      }

      const buildingPayloads = buildingDrafts.map((draft) =>
        toBuildingLocationPayload(draft.location)
      );
      const jurisdictionLocation = confirmedLocation ?? selectedLocation;
      const jurisdictionName =
        jurisdictionLocation.districtName ??
        jurisdictionLocation.region2DepthName ??
        jurisdictionLocation.address ??
        "관할 지구";

      await signup({
        name,
        email,
        password,
        job,
        ...(job === "FACILITY_MANAGER"
          ? {
              building_location: buildingPayloads[0],
            }
          : {
              jurisdiction: {
                code: jurisdictionLocation.districtCode,
                name: jurisdictionName,
                address: jurisdictionLocation.address,
                latitude: jurisdictionLocation.latitude,
                longitude: jurisdictionLocation.longitude,
                provider: jurisdictionLocation.provider ?? "KAKAO",
                provider_place_id: jurisdictionLocation.providerPlaceId,
                region_1depth_name: jurisdictionLocation.region1DepthName,
                region_2depth_name: jurisdictionLocation.region2DepthName,
                region_3depth_name: jurisdictionLocation.region3DepthName,
              },
            }),
      });

      const loginResult = await signin(email, password);

      if (job === "FACILITY_MANAGER" && buildingPayloads.length > 1) {
        try {
          await Promise.all(
            buildingPayloads.slice(1).map((payload) =>
              createBuilding({
                accessToken: loginResult.access_token,
                payload,
              })
            )
          );
        } catch (error) {
          console.error("Additional building creation error:", error);
          alert("회원가입과 로그인은 완료됐지만 일부 추가 건물 등록에 실패했습니다.");
        }
      }

      localStorage.setItem("accessToken", loginResult.access_token);
      localStorage.setItem("currentUser", JSON.stringify(loginResult.user));
      window.dispatchEvent(new Event("auth-state-changed"));

      alert("회원가입이 완료되었습니다.");
      router.push(job === "FIREFIGHTER" ? "/emergency" : "/facility");
    } catch (error) {
      console.error("Signup error:", error);
      alert("회원가입에 실패했습니다. 입력값을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-8 py-28">
        <div className="space-y-2">
          <a href="/" className="inline-flex items-center gap-2 mb-8 group">
            <span className="font-display text-xl tracking-tight">BIMFree</span>
            <span className="text-muted-foreground font-mono text-[10px] mt-0.5">
              HOME
            </span>
          </a>
          <h1 className="text-2xl font-display tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            역할과 위치를 등록해 접근 가능한 건물 범위를 설정합니다.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label>{locationLabel}</Label>
              {job === "FACILITY_MANAGER" && (
                <p className="text-xs text-muted-foreground">
                  위치를 확인한 뒤 건물 목록에 추가하세요. 여러 건물을 반복해서
                  추가할 수 있습니다.
                </p>
              )}
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

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={handleCheckLocation}>
                위치 확인
              </Button>
              {job === "FACILITY_MANAGER" && (
                <Button
                  type="button"
                  onClick={handleAddBuildingDraft}
                  disabled={!confirmedLocation}
                >
                  건물 목록에 추가
                </Button>
              )}
            </div>

            {confirmedLocation && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">{getLocationTitle(confirmedLocation)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getLocationDetail(confirmedLocation) || "주소 정보 없음"}
                </p>
              </div>
            )}

            {job === "FACILITY_MANAGER" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>추가된 건물</span>
                  <span>{buildingDrafts.length}개</span>
                </div>
                {buildingDrafts.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    아직 추가된 건물이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {buildingDrafts.map((draft, index) => (
                      <div
                        key={draft.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {index + 1}. {getLocationTitle(draft.location)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {getLocationDetail(draft.location) || "주소 정보 없음"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBuildingDraft(draft.id)}
                          className="shrink-0 text-xs text-red-700 underline-offset-4 hover:underline"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/sign-in"
            className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
