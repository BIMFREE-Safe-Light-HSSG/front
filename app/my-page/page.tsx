"use client";

import Link from "next/link";
import { ArrowRight, Mail, User as UserIcon } from "lucide-react";

import { BuildingAccessSidebar } from "@/components/facility/building-access-sidebar";
import { FacilityShell } from "@/components/facility/facility-shell";
import { useFacilityBuildings } from "@/hooks/use-facility-buildings";
import { useRequireJob } from "@/hooks/use-require-job";
import { formatViewerDateTime } from "@/lib/format/datetime";

function MyPageContent() {
  const { loading, user, buildings, selectedBuildingId, setSelectedBuildingId, addBuilding } =
    useFacilityBuildings();

  if (loading) {
    return <div className="p-20 text-center font-mono text-zinc-400">LOADING...</div>;
  }

  return (
    <FacilityShell eyebrow="My Page" title="마이페이지">
      <div className="grid min-h-[60vh] grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <BuildingAccessSidebar
            buildings={buildings}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
            onBuildingAdded={addBuilding}
            title="내 건물"
            className="min-h-[520px]"
          />
        </div>

        <div
          className="lg:col-span-8 rounded-[2rem] border border-white/60 bg-white/30 p-8 shadow-2xl"
          style={{ backdropFilter: "blur(20px)" }}
        >
          <h2 className="font-black text-xs uppercase italic tracking-[0.3em] text-zinc-400">
            Account
          </h2>

          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-red-900/10 bg-white/40 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-950 text-white">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-900">{user?.name ?? "—"}</p>
                <p className="mt-1 text-sm text-zinc-500">시설관리자</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-red-900/10 bg-white/40 px-5 py-4 text-sm">
              <Mail className="h-4 w-4 text-red-900/50" />
              <span className="text-zinc-700">{user?.email ?? "—"}</span>
            </div>

            {user?.created_at ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                가입일 {formatViewerDateTime(user.created_at)}
              </p>
            ) : null}
          </div>

          <div className="mt-10 space-y-3 border-t border-red-950/10 pt-8">
            <h3 className="font-black text-xs uppercase italic tracking-[0.3em] text-zinc-400">
              바로가기
            </h3>
            <Link
              href="/facility"
              className="flex items-center justify-between rounded-2xl border border-red-900/10 bg-white/40 px-5 py-4 transition-colors hover:bg-white/70"
            >
              <span className="text-sm font-bold text-zinc-900">시설 관리 · 3D 뷰어</span>
              <ArrowRight className="h-4 w-4 text-red-900/50" />
            </Link>
            <Link
              href={
                selectedBuildingId
                  ? `/upload?buildingId=${encodeURIComponent(selectedBuildingId)}`
                  : "/upload"
              }
              className="flex items-center justify-between rounded-2xl border border-red-900/10 bg-white/40 px-5 py-4 transition-colors hover:bg-white/70"
            >
              <span className="text-sm font-bold text-zinc-900">스캔 업로드</span>
              <ArrowRight className="h-4 w-4 text-red-900/50" />
            </Link>
          </div>
        </div>
      </div>
    </FacilityShell>
  );
}

export default function MyPage() {
  const isReady = useRequireJob("FACILITY_MANAGER", "/emergency");

  if (!isReady) {
    return <div className="p-20 text-center font-mono text-zinc-400">LOADING...</div>;
  }

  return <MyPageContent />;
}
