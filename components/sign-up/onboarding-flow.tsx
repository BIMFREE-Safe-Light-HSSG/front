"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { signin, signup, type UserJob } from "@/app/api/auth";
import { createBuilding } from "@/app/api/viewer";
import {
  KakaoLocationPicker,
  type SelectedKakaoLocation,
} from "@/components/kakao-location-picker";
import { SignUpStepDots } from "@/components/sign-up/sign-up-shell";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_KAKAO_LOCATION,
  getLocationDetail,
  getLocationTitle,
  isSameBuildingLocation,
  toBuildingLocationPayload,
  toSignupJurisdiction,
} from "@/lib/sign-up/location";
type BuildingDraft = {
  id: string;
  location: SelectedKakaoLocation;
};

const createDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

export type OnboardingFormData = {
  name: string;
  email: string;
  password: string;
  job: UserJob;
};

type OnboardingFlowProps = OnboardingFormData & {
  onBackToAccount?: () => void;
};

export function OnboardingFlow({ name, email, password, job, onBackToAccount }: OnboardingFlowProps) {
  const router = useRouter();
  const isFacility = job === "FACILITY_MANAGER";

  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedKakaoLocation>(DEFAULT_KAKAO_LOCATION);
  const [confirmedLocation, setConfirmedLocation] =
    useState<SelectedKakaoLocation | null>(null);
  const [buildingDrafts, setBuildingDrafts] = useState<BuildingDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const steps = isFacility
    ? (["안내", "위치지정", "Finish"] as const)
    : (["안내", "위치지정", "Finish"] as const);

  const stepCaption =
    onboardingStep === 2
      ? "Finish"
      : onboardingStep === 1
        ? "Step 2 · 위치지정"
        : "Step 1 · 안내";

  const persistSession = (accessToken: string, user: unknown) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("currentUser", JSON.stringify(user));
    window.dispatchEvent(new Event("auth-state-changed"));
  };

  const handleCheckLocation = () => {
    if (
      !Number.isFinite(selectedLocation.latitude) ||
      !Number.isFinite(selectedLocation.longitude)
    ) {
      alert("지도에서 위치를 선택해주세요.");
      return;
    }

    if (isFacility && !selectedLocation.address && !selectedLocation.placeName) {
      alert("건물 위치를 검색하거나 지도에서 선택해주세요.");
      return;
    }

    if (!isFacility) {
      if (!selectedLocation.districtCode?.trim()) {
        alert(
          "관할 지구 코드를 확인할 수 없습니다. 행정구역(법정동/구)이 표시되는 위치를 선택해주세요.",
        );
        return;
      }
      if (!selectedLocation.districtName?.trim() && !selectedLocation.region2DepthName?.trim()) {
        alert("관할 지구 이름을 확인할 수 있는 위치를 선택해주세요.");
        return;
      }
    }

    setConfirmedLocation(selectedLocation);
  };

  const handleAddBuilding = () => {
    if (!confirmedLocation) {
      alert("위치 확인을 먼저 완료해주세요.");
      return;
    }
    if (buildingDrafts.some((d) => isSameBuildingLocation(d.location, confirmedLocation))) {
      alert("이미 추가된 건물입니다.");
      return;
    }
    setBuildingDrafts((current) => [
      ...current,
      { id: createDraftId(), location: confirmedLocation },
    ]);
    setConfirmedLocation(null);
  };

  const completeSignup = async (jurisdiction?: ReturnType<typeof toSignupJurisdiction>) => {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      await signup({
        name,
        email,
        password,
        job,
        ...(jurisdiction ? { jurisdiction } : {}),
      });

      const loginResult = await signin(email, password);
      persistSession(loginResult.access_token, loginResult.user);

      if (isFacility && buildingDrafts.length > 0) {
        const results = await Promise.allSettled(
          buildingDrafts.map((draft) =>
            createBuilding({
              accessToken: loginResult.access_token,
              payload: toBuildingLocationPayload(draft.location),
            }),
          ),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          setSubmitError(
            `계정은 생성됐지만 건물 ${failed}건 등록에 실패했습니다. 시설 페이지에서 다시 등록할 수 있습니다.`,
          );
        }
      }

      setOnboardingStep(steps.length - 1);
    } catch (error) {
      console.error("Onboarding signup error:", error);
      setSubmitError("가입 처리에 실패했습니다. 입력값을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFireJurisdictionNext = async () => {
    if (!confirmedLocation) {
      alert("관할 지구 위치 확인을 완료해주세요.");
      return;
    }
    try {
      const jurisdiction = toSignupJurisdiction(confirmedLocation);
      await completeSignup(jurisdiction);
    } catch (error) {
      alert(error instanceof Error ? error.message : "관할 지구 확인에 실패했습니다.");
    }
  };

  const handleFacilityBuildingsNext = async () => {
    if (buildingDrafts.length === 0) {
      alert("관리할 건물을 1개 이상 추가하거나, 아래에서 나중에 등록을 선택해주세요.");
      return;
    }
    await completeSignup();
  };

  const handleSkipBuildings = async () => {
    await completeSignup();
  };

  const goToWorkspace = () => {
    router.push(isFacility ? "/facility" : "/emergency");
  };

  const jurisdictionPreview =
    confirmedLocation && !isFacility
      ? (() => {
          try {
            return toSignupJurisdiction(confirmedLocation);
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <SignUpStepDots total={steps.length} current={onboardingStep} />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-red-800/50">
          {stepCaption}
        </p>
      </div>

      {onboardingStep === 0 ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950 text-white shadow-lg shadow-red-950/25">
            {isFacility ? (
              <Building2 className="h-8 w-8" />
            ) : (
              <ShieldCheck className="h-8 w-8" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl tracking-tight text-zinc-900">
              {name}님, 환영합니다
            </h2>
          </div>
          <div className="rounded-2xl border border-red-900/10 bg-red-50/50 px-4 py-3 text-left text-xs text-zinc-600">
            <p>
              <span className="font-bold text-red-900">이메일</span> {email}
            </p>
            <p className="mt-1">
              <span className="font-bold text-red-900">역할</span>{" "}
              {isFacility ? "시설관리자" : "소방대원"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => setOnboardingStep(1)}
              className="h-12 w-full rounded-full bg-red-950 text-white hover:bg-red-900"
            >
              다음
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {onBackToAccount ? (
              <button
                type="button"
                onClick={onBackToAccount}
                className="text-xs text-zinc-500 underline-offset-4 hover:text-red-800 hover:underline"
              >
                계정 정보 수정
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {onboardingStep === 1 && isFacility ? (
        <div className="space-y-5">
          <h2 className="font-display text-xl tracking-tight">관리 건물 등록</h2>

          <KakaoLocationPicker
            label="건물 위치"
            latitude={selectedLocation.latitude}
            longitude={selectedLocation.longitude}
            onChange={(location) => {
              setSelectedLocation(location);
              setConfirmedLocation(null);
            }}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={handleCheckLocation} className="rounded-xl">
              위치 확인
            </Button>
            <Button
              type="button"
              onClick={handleAddBuilding}
              disabled={!confirmedLocation}
              className="rounded-xl bg-red-950 text-white hover:bg-red-900"
            >
              <Plus className="mr-1 h-4 w-4" />
              목록에 추가
            </Button>
          </div>

          {confirmedLocation ? (
            <div className="rounded-xl border border-red-200/60 bg-white/70 p-3 text-sm">
              <p className="font-medium text-zinc-900">{getLocationTitle(confirmedLocation)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {getLocationDetail(confirmedLocation) || "주소 정보 없음"}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>등록 예정 건물</span>
              <span>{buildingDrafts.length}개</span>
            </div>
            {buildingDrafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
                추가된 건물이 없습니다.
              </div>
            ) : (
              <ul className="space-y-2">
                {buildingDrafts.map((draft, index) => (
                  <li
                    key={draft.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {index + 1}. {getLocationTitle(draft.location)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                        {getLocationDetail(draft.location)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setBuildingDrafts((c) => c.filter((b) => b.id !== draft.id))
                      }
                      className="shrink-0 text-red-700 hover:text-red-900"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {submitError ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{submitError}</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setOnboardingStep(0)}
              disabled={isSubmitting}
            >
              이전
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-full bg-red-950 text-white hover:bg-red-900"
              onClick={() => void handleFacilityBuildingsNext()}
              disabled={isSubmitting || buildingDrafts.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  등록 중…
                </>
              ) : (
                "가입 완료 · 건물 등록"
              )}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => void handleSkipBuildings()}
            disabled={isSubmitting}
            className="w-full text-center text-xs text-zinc-500 underline-offset-4 hover:text-red-800 hover:underline disabled:opacity-50"
          >
            건물은 나중에 등록하고 가입만 완료하기
          </button>
        </div>
      ) : null}

      {onboardingStep === 1 && !isFacility ? (
        <div className="space-y-5">
          <h2 className="font-display text-xl tracking-tight">관할 지구 설정</h2>

          <KakaoLocationPicker
            label="관할 지구"
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
            className="w-full rounded-xl"
          >
            <MapPin className="mr-2 h-4 w-4" />
            관할 지구 확인
          </Button>

          {confirmedLocation ? (
            <div className="space-y-3 rounded-xl border border-red-200/60 bg-red-50/40 p-4">
              <p className="text-sm font-medium text-zinc-900">
                {getLocationTitle(confirmedLocation)}
              </p>
              <p className="text-xs text-zinc-500">
                {getLocationDetail(confirmedLocation) || "주소 정보 없음"}
              </p>
              {jurisdictionPreview ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-white/80 p-3 font-mono text-[11px] text-zinc-700">
                  <dt className="text-zinc-400">code</dt>
                  <dd>{jurisdictionPreview.code}</dd>
                  <dt className="text-zinc-400">name</dt>
                  <dd>{jurisdictionPreview.name}</dd>
                </dl>
              ) : null}
            </div>
          ) : null}

          {submitError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{submitError}</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setOnboardingStep(0)}
              disabled={isSubmitting}
            >
              이전
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-full bg-red-950 text-white hover:bg-red-900"
              onClick={() => void handleFireJurisdictionNext()}
              disabled={isSubmitting || !jurisdictionPreview}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  가입 처리 중…
                </>
              ) : (
                "가입 완료"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {onboardingStep === 2 ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl tracking-tight text-zinc-900">
              계정이 생성되었습니다
            </h2>
          </div>
          {submitError ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{submitError}</p>
          ) : null}
          <Button
            type="button"
            onClick={goToWorkspace}
            className="h-12 w-full rounded-full bg-red-950 text-white hover:bg-red-900"
          >
            워크스페이스로 이동
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
