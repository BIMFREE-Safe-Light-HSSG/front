"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthUser } from "@/app/api/auth";
import { getBuildings, type ViewerBuilding } from "@/app/api/viewer";
import { mergeDemoFacilityBuildings } from "@/lib/facility-demo/seed";
import { handleUnauthorized } from "@/lib/http/errors";

export function useFacilityBuildings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [buildings, setBuildings] = useState<ViewerBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("currentUser");

    if (!token || !storedUser) {
      router.push("/sign-in");
      return;
    }

    try {
      setLoading(true);
      const parsedUser = JSON.parse(storedUser) as AuthUser;

      if (parsedUser.job !== "FACILITY_MANAGER") {
        alert("시설관리자 전용 기능입니다.");
        router.replace("/");
        return;
      }

      const list = mergeDemoFacilityBuildings(await getBuildings(token), parsedUser);
      const requestedBuildingId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("buildingId")
          : null;

      setUser(parsedUser);
      setBuildings(list);
      setSelectedBuildingId((prev) => {
        if (prev && list.some((building) => building.id === prev)) {
          return prev;
        }
        if (requestedBuildingId && list.some((building) => building.id === requestedBuildingId)) {
          return requestedBuildingId;
        }
        return list[0]?.id ?? null;
      });
    } catch (error) {
      if (handleUnauthorized(error, () => router.push("/sign-in"))) {
        return;
      }
      alert("건물 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const addBuilding = useCallback((building: ViewerBuilding) => {
    setBuildings((current) => [
      building,
      ...current.filter((item) => item.id !== building.id),
    ]);
    setSelectedBuildingId(building.id);
  }, []);

  return {
    loading,
    user,
    buildings,
    setBuildings,
    selectedBuildingId,
    setSelectedBuildingId,
    reload: load,
    addBuilding,
  };
}
