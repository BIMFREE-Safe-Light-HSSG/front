"use client";

import { useEffect, useRef, useState } from "react";

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMap = {
  relayout: () => void;
  setCenter: (latLng: KakaoLatLng) => void;
};

type KakaoMarker = {
  setPosition: (latLng: KakaoLatLng) => void;
};

type KakaoGeocoder = {
  addressSearch: (
    query: string,
    callback: (
      result: Array<{
        x: string;
        y: string;
        address_name: string;
      }>,
      status: string
    ) => void
  ) => void;
  coord2Address: (
    longitude: number,
    latitude: number,
    callback: (
      result: Array<{
        address?: {
          address_name: string;
          b_code?: string;
          region_1depth_name?: string;
          region_2depth_name?: string;
          region_3depth_name?: string;
        };
        road_address?: {
          address_name: string;
        } | null;
      }>,
      status: string
    ) => void
  ) => void;
  coord2RegionCode: (
    longitude: number,
    latitude: number,
    callback: (
      result: Array<{
        region_type: string;
        code: string;
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
      }>,
      status: string
    ) => void
  ) => void;
};

type KakaoPlaces = {
  keywordSearch: (
    query: string,
    callback: (
      result: Array<{
        x: string;
        y: string;
        place_name: string;
        id: string;
        address_name: string;
        road_address_name: string;
      }>,
      status: string
    ) => void
  ) => void;
};

type KakaoMapsApi = {
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number }
  ) => KakaoMap;
  Marker: new (options: { map: KakaoMap; position: KakaoLatLng }) => KakaoMarker;
  event: {
    addListener: (
      target: KakaoMap,
      type: "click",
      handler: (event: { latLng: KakaoLatLng }) => void
    ) => void;
  };
  load: (callback: () => void) => void;
  services: {
    Status: {
      OK: string;
      ZERO_RESULT: string;
    };
    Geocoder: new () => KakaoGeocoder;
    Places: new () => KakaoPlaces;
  };
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMapsApi;
    };
    __kakaoMapsLoadingPromise?: Promise<void>;
  }
}

type KakaoLocationPickerProps = {
  latitude: number;
  longitude: number;
  label: string;
  onChange: (location: SelectedKakaoLocation) => void;
};

export type SelectedKakaoLocation = {
  latitude: number;
  longitude: number;
  placeName?: string;
  providerPlaceId?: string;
  provider?: "KAKAO";
  address?: string;
  districtCode?: string;
  districtName?: string;
  region1DepthName?: string;
  region2DepthName?: string;
  region3DepthName?: string;
};

const KAKAO_SCRIPT_ID = "kakao-map-sdk";

function loadKakaoMaps(appKey: string) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.kakao?.maps) {
    return new Promise<void>((resolve) => {
      window.kakao?.maps.load(resolve);
    });
  }

  if (window.__kakaoMapsLoadingPromise) {
    return window.__kakaoMapsLoadingPromise;
  }

  window.__kakaoMapsLoadingPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => window.kakao?.maps.load(resolve), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Kakao Maps SDK load failed.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey
    )}&libraries=services&autoload=false`;
    script.onload = () => window.kakao?.maps.load(resolve);
    script.onerror = () => reject(new Error("Kakao Maps SDK load failed."));

    document.head.appendChild(script);
  });

  return window.__kakaoMapsLoadingPromise;
}

export function KakaoLocationPicker({
  latitude,
  longitude,
  label,
  onChange,
}: KakaoLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const geocoderRef = useRef<KakaoGeocoder | null>(null);
  const placesRef = useRef<KakaoPlaces | null>(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;

    if (!appKey) {
      setStatus("error");
      setErrorMessage("NEXT_PUBLIC_KAKAO_MAP_JS_KEY가 설정되지 않았습니다.");
      return;
    }

    if (!mapContainerRef.current) return;

    let isMounted = true;

    setStatus("loading");
    loadKakaoMaps(appKey)
      .then(() => {
        if (!isMounted || !mapContainerRef.current || !window.kakao?.maps) return;

        const kakaoMaps = window.kakao.maps;
        const center = new kakaoMaps.LatLng(latitude, longitude);
        const map = new kakaoMaps.Map(mapContainerRef.current, {
          center,
          level: 4,
        });
        const marker = new kakaoMaps.Marker({
          map,
          position: center,
        });
        const geocoder = new kakaoMaps.services.Geocoder();
        const places = new kakaoMaps.services.Places();

        kakaoMaps.event.addListener(map, "click", (event) => {
          const selectedLatitude = event.latLng.getLat();
          const selectedLongitude = event.latLng.getLng();
          marker.setPosition(event.latLng);
          resolveLocation(selectedLatitude, selectedLongitude);
        });

        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = geocoder;
        placesRef.current = places;
        map.relayout();
        setStatus("ready");
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Kakao Maps SDK를 불러오지 못했습니다.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!window.kakao?.maps || !mapRef.current || !markerRef.current) return;

    const latLng = new window.kakao.maps.LatLng(latitude, longitude);
    mapRef.current.setCenter(latLng);
    markerRef.current.setPosition(latLng);
  }, [latitude, longitude]);

  const resolveLocation = (
    selectedLatitude = latitude,
    selectedLongitude = longitude,
    place?: {
      placeName?: string;
      providerPlaceId?: string;
      address?: string;
    }
  ) => {
    if (!window.kakao?.maps || !geocoderRef.current) {
      onChangeRef.current({
        latitude: selectedLatitude,
        longitude: selectedLongitude,
        provider: "KAKAO",
        placeName: place?.placeName,
        providerPlaceId: place?.providerPlaceId,
        address: place?.address,
      });
      return;
    }

    setIsResolving(true);
    setErrorMessage("");

    const geocoder = geocoderRef.current;

    geocoder.coord2Address(selectedLongitude, selectedLatitude, (addressResult, addressStatus) => {
      geocoder.coord2RegionCode(selectedLongitude, selectedLatitude, (regionResult, regionStatus) => {
        setIsResolving(false);

        const addressData = addressStatus === window.kakao?.maps.services.Status.OK ? addressResult[0] : null;
        const legalRegion =
          regionStatus === window.kakao?.maps.services.Status.OK
            ? regionResult.find((region) => region.region_type === "B") ?? regionResult[0]
            : null;

        onChangeRef.current({
          latitude: selectedLatitude,
          longitude: selectedLongitude,
          provider: "KAKAO",
          placeName: place?.placeName,
          providerPlaceId: place?.providerPlaceId,
          address: place?.address ?? addressData?.road_address?.address_name ?? addressData?.address?.address_name,
          districtCode: legalRegion?.code ?? addressData?.address?.b_code,
          districtName: legalRegion?.region_2depth_name ?? addressData?.address?.region_2depth_name,
          region1DepthName: legalRegion?.region_1depth_name ?? addressData?.address?.region_1depth_name,
          region2DepthName: legalRegion?.region_2depth_name ?? addressData?.address?.region_2depth_name,
          region3DepthName: legalRegion?.region_3depth_name ?? addressData?.address?.region_3depth_name,
        });

        if (!addressData && !legalRegion) {
          setStatus("error");
          setErrorMessage("선택한 좌표의 주소를 확인하지 못했습니다.");
        } else {
          setStatus("ready");
        }
      });
    });
  };

  const moveToLocation = (
    selectedLatitude: number,
    selectedLongitude: number,
    place?: {
      placeName?: string;
      providerPlaceId?: string;
      address?: string;
    }
  ) => {
    if (!window.kakao?.maps) return;

    const latLng = new window.kakao.maps.LatLng(selectedLatitude, selectedLongitude);
    mapRef.current?.setCenter(latLng);
    markerRef.current?.setPosition(latLng);
    resolveLocation(selectedLatitude, selectedLongitude, place);
    setStatus("ready");
  };

  const handleKeywordSearch = (query: string) => {
    if (!placesRef.current) {
      setIsSearching(false);
      setStatus("error");
      setErrorMessage("장소 검색을 초기화하지 못했습니다.");
      return;
    }

    placesRef.current.keywordSearch(query, (result, searchStatus) => {
      setIsSearching(false);

      if (searchStatus !== window.kakao?.maps.services.Status.OK || result.length === 0) {
        setStatus("error");
        setErrorMessage("검색 결과가 없습니다. 건물명, 장소명, 도로명 주소를 다시 입력해주세요.");
        return;
      }

      const selected = result[0];
      const selectedLatitude = Number(selected.y);
      const selectedLongitude = Number(selected.x);

      if (!Number.isFinite(selectedLatitude) || !Number.isFinite(selectedLongitude)) {
        setStatus("error");
        setErrorMessage("장소 검색 결과 좌표를 읽지 못했습니다.");
        return;
      }

      moveToLocation(selectedLatitude, selectedLongitude, {
        placeName: selected.place_name,
        providerPlaceId: selected.id,
        address: selected.road_address_name || selected.address_name,
      });
    });
  };

  const handleAddressSearch = () => {
    const query = addressQuery.trim();

    if (!query || !window.kakao?.maps || !mapRef.current || !markerRef.current || !geocoderRef.current) {
      return;
    }

    setIsSearching(true);
    setErrorMessage("");

    const geocoder = geocoderRef.current;
    geocoder.addressSearch(query, (result, searchStatus) => {
      if (searchStatus !== window.kakao?.maps.services.Status.OK || result.length === 0) {
        handleKeywordSearch(query);
        return;
      }

      setIsSearching(false);
      const selected = result[0];
      const selectedLatitude = Number(selected.y);
      const selectedLongitude = Number(selected.x);

      if (!Number.isFinite(selectedLatitude) || !Number.isFinite(selectedLongitude)) {
        setStatus("error");
        setErrorMessage("주소 검색 결과 좌표를 읽지 못했습니다.");
        return;
      }

      moveToLocation(selectedLatitude, selectedLongitude, {
        address: selected.address_name,
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={addressQuery}
          onChange={(event) => setAddressQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAddressSearch();
            }
          }}
          placeholder="건물명, 장소명, 주소를 입력하세요"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <button
          type="button"
          onClick={handleAddressSearch}
          disabled={status === "loading" || isSearching || !addressQuery.trim()}
          className="h-10 rounded-md bg-red-950 px-4 text-sm font-medium text-white transition-colors hover:bg-black disabled:pointer-events-none disabled:opacity-50"
        >
          {isSearching ? "검색 중" : "검색"}
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        <div ref={mapContainerRef} className="h-72 w-full" aria-label={label} />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {status === "loading" && "지도를 불러오는 중입니다."}
          {status === "ready" && (isResolving ? "주소를 확인하는 중입니다." : "지도에서 위치를 클릭해 선택하세요.")}
          {status === "error" && errorMessage}
          {status === "idle" && "지도 초기화 대기 중입니다."}
        </span>
        <span className="font-mono">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </div>
    </div>
  );
}
