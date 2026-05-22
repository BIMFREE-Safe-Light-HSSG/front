"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import { createBuilding } from "@/app/api/viewer";
import {
  KakaoLocationPicker,
  type SelectedKakaoLocation,
} from "@/components/kakao-location-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createdBuildingToViewer } from "@/lib/facility/buildings";
import {
  DEFAULT_KAKAO_LOCATION,
  getLocationDetail,
  getLocationTitle,
  toBuildingLocationPayload,
} from "@/lib/sign-up/location";
import { handleUnauthorized } from "@/lib/http/errors";
import type { ViewerBuilding } from "@/app/api/viewer";

type AddBuildingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (building: ViewerBuilding) => void;
};

export function AddBuildingDialog({ open, onOpenChange, onAdded }: AddBuildingDialogProps) {
  const router = useRouter();
  const [location, setLocation] = useState<SelectedKakaoLocation>(DEFAULT_KAKAO_LOCATION);
  const [confirmedLocation, setConfirmedLocation] = useState<SelectedKakaoLocation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setLocation(DEFAULT_KAKAO_LOCATION);
    setConfirmedLocation(null);
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next && !submitting) {
      resetForm();
    }
  };

  const handleConfirmLocation = () => {
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      alert("지도에서 건물 위치를 선택해주세요.");
      return;
    }
    if (!location.address && !location.placeName) {
      alert("건물 위치를 검색하거나 지도에서 선택해주세요.");
      return;
    }
    setConfirmedLocation(location);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!confirmedLocation) {
      alert("건물 위치 확인을 먼저 완료해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createBuilding({
        accessToken: token,
        payload: toBuildingLocationPayload(confirmedLocation),
      });
      const viewerBuilding = createdBuildingToViewer(created);
      onAdded(viewerBuilding);
      handleOpenChange(false);
      alert("건물이 추가되었습니다.");
    } catch (error) {
      if (handleUnauthorized(error, () => router.push("/sign-in"))) {
        return;
      }
      alert("건물 추가에 실패했습니다. 위치 정보를 확인한 뒤 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>건물 추가</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <KakaoLocationPicker
            label="건물 위치"
            latitude={location.latitude}
            longitude={location.longitude}
            onChange={(next) => {
              setLocation(next);
              setConfirmedLocation(null);
            }}
          />

          <Button type="button" variant="outline" onClick={handleConfirmLocation} className="w-full">
            위치 확인
          </Button>

          {confirmedLocation ? (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-900" />
                <div className="min-w-0">
                  <p className="font-medium">{getLocationTitle(confirmedLocation)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getLocationDetail(confirmedLocation) || "주소 정보 없음"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!confirmedLocation || submitting}
          >
            {submitting ? "추가 중…" : "건물 추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
