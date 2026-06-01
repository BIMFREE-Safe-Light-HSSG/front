"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  Database,
  LogOut,
  ShieldCheck,
  UploadCloud,
  User,
} from "lucide-react";
import { getMe, type AuthUser } from "@/app/api/auth";
import { getBuildings, type ViewerBuilding } from "@/app/api/viewer";
import { EmergencyFireNotifications } from "@/components/emergency-fire-notifications";
import { Button } from "@/components/ui/button";
import { mergeDemoWorkspace } from "@/lib/facility-demo/seed";
const getStoredUser = () => {
  const userJson = localStorage.getItem("currentUser");

  if (!userJson) return null;

  try {
    return JSON.parse(userJson) as AuthUser;
  } catch {
    return null;
  }
};

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [emergencyBuildings, setEmergencyBuildings] = useState<ViewerBuilding[]>([]);

  useEffect(() => {
    const syncUser = async () => {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        setUser(null);
        return;
      }

      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        return;
      }

      try {
        const fetchedUser = await getMe(token);
        localStorage.setItem("currentUser", JSON.stringify(fetchedUser));
        setUser(fetchedUser);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("currentUser");
        setUser(null);
      }
    };

    syncUser();
    window.addEventListener("auth-state-changed", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("auth-state-changed", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadEmergencyBuildings = async () => {
      if (user?.job !== "FIREFIGHTER") {
        setEmergencyBuildings([]);
        return;
      }

      const token = localStorage.getItem("accessToken");
      if (!token) return;

      try {
        const data = mergeDemoWorkspace(
          {
            buildings: await getBuildings(token),
            default_building_id: null,
            default_scene_graph: null,
          },
          user,
        );
        if (isMounted) setEmergencyBuildings(data.buildings);
      } catch {
        if (isMounted) setEmergencyBuildings([]);
      }
    };

    void loadEmergencyBuildings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentUser");
    window.dispatchEvent(new Event("auth-state-changed"));
    setUser(null);
  };

  const isFacilityManager = user?.job === "FACILITY_MANAGER";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffafa] px-6 py-8 text-zinc-950">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-[8%] top-[16%] h-[420px] w-[420px] rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute right-[10%] top-[24%] h-[520px] w-[520px] rounded-full bg-red-100/50 blur-3xl" />
        <div className="absolute bottom-[6%] left-[28%] h-[420px] w-[420px] rounded-full bg-red-200/20 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-950 text-white shadow-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-red-900/50">
                BIMFree
              </p>
              <p className="text-sm text-zinc-500">Data To Safety</p>
            </div>
          </Link>

          {user ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isFacilityManager ? (
                <Link
                  href="/my-page"
                  className="inline-flex items-center gap-2 rounded-full border border-red-900/10 bg-white/40 px-4 py-2 text-xs font-bold text-zinc-600 backdrop-blur-md transition-colors hover:bg-white/70"
                >
                  <User className="h-3.5 w-3.5" />
                  마이페이지
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full border border-red-900/10 bg-white/40 px-5 py-2 text-xs font-bold uppercase tracking-widest text-zinc-500 backdrop-blur-md transition-colors hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : null}
        </header>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-8 inline-flex items-center gap-3 border-l-4 border-red-900 pl-5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-red-900/40">
                {user ? "Workspace Gateway" : "BIM-Free Safety Platform"}
              </span>
            </div>

            <h1 className="max-w-3xl text-6xl font-black tracking-tight sm:text-7xl lg:text-8xl">
              DATA
              <br />
              <span className="text-red-50/10 [-webkit-text-stroke:1.5px_#991b1b]">TO Safety.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-600">
              {user
                ? `${user.name ?? user.email}님, ${isFacilityManager ? "시설관리 업무를 시작하세요." : "관할 지구 건물 정보를 확인하세요."}`
                : "다중이용시설과 대형 건축물의 안전 정보를 디지털 트윈으로 시각화해, 시설 관리자가 점검 이력과 위험 요소를 한곳에서 관리할 수 있게 합니다. 화재 시에는 구조대원이 건물 구조와 위험 구역, 대피 가능 동선을 빠르게 파악해 구조 경로를 판단하도록 돕습니다."}
            </p>

            {!user && (
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full bg-red-950 px-8 text-white hover:bg-black">
                  <Link href="/sign-in">
                    로그인
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-red-900/20 bg-white/50 px-8">
                  <Link href="/sign-up">회원가입</Link>
                </Button>
              </div>
            )}
          </div>

          <div
            className="relative rounded-[2rem] border border-white/60 bg-white/30 p-6 shadow-[0_25px_50px_-12px_rgba(220,38,38,0.12)] backdrop-blur-[30px]"
            style={{
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
            }}
          >
            <div className="absolute inset-0 rounded-[2rem] border border-white/60 pointer-events-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]" />
            <div className="relative space-y-4">
              {user ? (
                isFacilityManager ? (
                  <>
                    <ActionCard
                      href="/facility"
                      icon={<Database className="h-5 w-5" />}
                      title="시설관리 페이지"
                      description="관리 건물 목록과 scene graph를 확인합니다."
                    />
                    <ActionCard
                      href="/upload"
                      icon={<UploadCloud className="h-5 w-5" />}
                      title="스캔 업로드"
                      description="본인 소유 건물의 스캔 파일을 업로드하고 변환을 요청합니다."
                    />
                  </>
                ) : (
                  <>
                    <EmergencyFireNotifications pollBuildings={emergencyBuildings} />
                    <ActionCard
                      href="/emergency"
                      icon={<ShieldCheck className="h-5 w-5" />}
                      title="건물 정보 조회"
                      description="관할 지구 내 건물 목록과 scene graph를 확인합니다."
                    />
                  </>
                )
              ) : (
                <>
                  <InfoCard
                    icon={<Building2 className="h-5 w-5" />}
                    title="시설관리자"
                    description="건물 위치 등록, 스캔 업로드, scene graph 조회를 수행합니다."
                  />
                  <InfoCard
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="소방대원"
                    description="관할 지구 기반으로 접근 가능한 건물 정보를 조회합니다."
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-5 rounded-2xl border border-red-900/10 bg-white/45 p-5 transition-all hover:bg-white/70 hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-950 text-white">
          {icon}
        </div>
        <div>
          <h2 className="font-bold text-zinc-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-red-900/40 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-red-900/10 bg-white/45 p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-950/10 text-red-950">
        {icon}
      </div>
      <h2 className="font-bold text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}
