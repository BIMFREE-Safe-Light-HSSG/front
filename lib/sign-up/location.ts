import type { BuildingLocationPayload, SignupJurisdictionPayload } from "@/app/api/auth";
import type { SelectedKakaoLocation } from "@/components/kakao-location-picker";

/** FRONT.md POST /auth/signup — jurisdiction은 code·name만 */
export function toSignupJurisdiction(
  location: SelectedKakaoLocation,
): SignupJurisdictionPayload {
  const code = location.districtCode?.trim();
  const name =
    location.districtName?.trim() ||
    location.region2DepthName?.trim() ||
    location.region3DepthName?.trim();

  if (!code) {
    throw new Error(
      "관할 지구 코드(district_code)를 확인할 수 없습니다. 지도에서 행정구역이 잡히는 위치를 선택해주세요.",
    );
  }

  if (!name) {
    throw new Error("관할 지구 이름을 확인할 수 없습니다. 지도에서 위치를 다시 선택해주세요.");
  }

  return { code, name };
}

export function toBuildingLocationPayload(
  location: SelectedKakaoLocation,
): BuildingLocationPayload {
  return {
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
  };
}

export function getLocationTitle(location: SelectedKakaoLocation) {
  const region = [location.region1DepthName, location.region2DepthName, location.region3DepthName]
    .filter(Boolean)
    .join(" ");

  return (
    location.placeName ||
    location.address ||
    region ||
    `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
  );
}

export function getLocationDetail(location: SelectedKakaoLocation) {
  const region = [location.region1DepthName, location.region2DepthName, location.region3DepthName]
    .filter(Boolean)
    .join(" ");

  return [location.address, region, location.districtName].filter(Boolean).join(" · ");
}

export function isSameBuildingLocation(
  left: SelectedKakaoLocation,
  right: SelectedKakaoLocation,
) {
  if (left.providerPlaceId && right.providerPlaceId) {
    return left.providerPlaceId === right.providerPlaceId;
  }

  return (
    left.latitude.toFixed(6) === right.latitude.toFixed(6) &&
    left.longitude.toFixed(6) === right.longitude.toFixed(6)
  );
}

export const DEFAULT_KAKAO_LOCATION: SelectedKakaoLocation = {
  latitude: 37.5665,
  longitude: 126.978,
};
