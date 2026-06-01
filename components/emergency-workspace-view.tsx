"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  Compass,
  Database,
  Flame,
  Loader2,
  Thermometer,
  Users,
} from "lucide-react";

import type { AuthUser } from "@/app/api/auth";
import {
  getBuildingSceneGraph,
  getWorkspace,
  type SceneGraph,
  type ViewerBuilding,
} from "@/app/api/viewer";
import { EmbeddedBuildingSceneViewer } from "@/components/facility-building-viewer/EmbeddedBuildingSceneViewer";
import { EmergencyFireNotifications } from "@/components/emergency-fire-notifications";
import { getStoredAuthUser } from "@/lib/auth/storage";
import {
  getBuildingActiveFireCount,
  sortBuildingsByFirePriority,
} from "@/lib/fire-incidents/building-list";
import type { SceneGraphFirePollResult } from "@/lib/fire-incidents/scene-graph-notifications";
import { FIRE_INCIDENTS_CHANGED_EVENT } from "@/lib/fire-incidents/storage";
import {
  getDemoSceneGraph,
  isDemoBuildingId,
  mergeDemoWorkspace,
} from "@/lib/facility-demo/seed";
import { formatViewerDateTime } from "@/lib/format/datetime";
import { getAxiosErrorStatus, handleUnauthorized } from "@/lib/http/errors";

type SceneGraphStatus = "idle" | "loading" | "ready" | "empty" | "forbidden" | "error";

export default function EmergencyWorkspaceView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [buildings, setBuildings] = useState<ViewerBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [sceneGraph, setSceneGraph] = useState<SceneGraph | null>(null);
  const [sceneGraphStatus, setSceneGraphStatus] = useState<SceneGraphStatus>("idle");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fireListRevision, setFireListRevision] = useState(0);

  const sortedBuildings = useMemo(
    () => sortBuildingsByFirePriority(buildings),
    [buildings, fireListRevision],
  );

  useEffect(() => {
    const refreshFireSort = () => setFireListRevision((value) => value + 1);
    window.addEventListener(FIRE_INCIDENTS_CHANGED_EVENT, refreshFireSort);
    return () => window.removeEventListener(FIRE_INCIDENTS_CHANGED_EVENT, refreshFireSort);
  }, []);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );

  const nodeCount = sceneGraph?.scene_graph.nodes?.length ?? 0;
  const edgeCount = sceneGraph?.scene_graph.edges?.length ?? 0;

  const handleSceneGraphPoll = useCallback(
    (result: SceneGraphFirePollResult) => {
      setBuildings((current) => {
        let changed = false;
        const next = current.map((building) => {
          const graph = result.sceneGraphsByBuildingId[building.id];
          const fireCount = result.fireCountsByBuildingId[building.id];
          const nextFireCount =
            typeof fireCount === "number" ? fireCount : building.active_fire_count;
          const nextLatestGraphCreatedAt = graph?.created_at ?? building.latest_graph_created_at;
          const nextHasSceneGraph = graph ? true : building.has_scene_graph;

          if (
            nextFireCount === building.active_fire_count &&
            nextLatestGraphCreatedAt === building.latest_graph_created_at &&
            nextHasSceneGraph === building.has_scene_graph
          ) {
            return building;
          }

          changed = true;
          return {
            ...building,
            active_fire_count: nextFireCount,
            latest_graph_created_at: nextLatestGraphCreatedAt,
            has_scene_graph: nextHasSceneGraph,
          };
        });

        return changed ? next : current;
      });

      if (selectedBuildingId) {
        const nextSceneGraph = result.sceneGraphsByBuildingId[selectedBuildingId];
        if (nextSceneGraph) {
          setSceneGraph((current) =>
            current?.graph_data_id === nextSceneGraph.graph_data_id ? current : nextSceneGraph,
          );
          setSceneGraphStatus("ready");
        }
      }

      setFireListRevision((value) => value + 1);
    },
    [selectedBuildingId],
  );

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("accessToken");

    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/sign-in");
      return;
    }

    const userJson = localStorage.getItem("currentUser");

    if (userJson) {
      try {
        setUser(JSON.parse(userJson) as AuthUser);
      } catch {
        setUser(null);
      }
    }

    const loadBootstrap = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const data = mergeDemoWorkspace(
          await getWorkspace(token),
          getStoredAuthUser(),
        );

        if (!isMounted) return;

        const requestedBuildingId =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("buildingId")
            : null;
        const defaultBuildingId =
          (requestedBuildingId &&
            data.buildings.some((building) => building.id === requestedBuildingId)
            ? requestedBuildingId
            : null) ??
          data.default_building_id ??
          data.buildings[0]?.id ??
          null;

        setBuildings(data.buildings);
        setSelectedBuildingId(defaultBuildingId);

        if (requestedBuildingId && defaultBuildingId === requestedBuildingId) {
          if (isDemoBuildingId(requestedBuildingId)) {
            const graph = getDemoSceneGraph(requestedBuildingId);
            setSceneGraph(graph);
            setSceneGraphStatus(graph ? "ready" : "empty");
          } else {
            try {
              const graph = await getBuildingSceneGraph(token, requestedBuildingId);
              setSceneGraph(graph);
              setSceneGraphStatus("ready");
            } catch (graphError) {
              if (handleUnauthorized(graphError, () => router.push("/sign-in"))) {
                return;
              }
              const status = getAxiosErrorStatus(graphError);
              if (status === 403) {
                setSceneGraphStatus("forbidden");
              } else if (status === 404) {
                setSceneGraphStatus("empty");
              } else {
                setSceneGraphStatus("error");
              }
            }
          }
        } else {
          setSceneGraph(data.default_scene_graph);
          setSceneGraphStatus(
            data.buildings.length === 0
              ? "idle"
              : data.default_scene_graph
                ? "ready"
                : "empty",
          );
        }
      } catch (error) {
        if (!isMounted) return;

        if (handleUnauthorized(error, () => router.push("/sign-in"))) {
          return;
        }

        setLoadError("뷰어 데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadBootstrap();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSelectBuilding = async (buildingId: string) => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/sign-in");
      return;
    }

    setSelectedBuildingId(buildingId);
    setSceneGraph(null);
    setSceneGraphStatus("loading");

    if (isDemoBuildingId(buildingId)) {
      const graph = getDemoSceneGraph(buildingId);
      if (graph) {
        setSceneGraph(graph);
        setSceneGraphStatus("ready");
      } else {
        setSceneGraphStatus("empty");
      }
      return;
    }

    try {
      const graph = await getBuildingSceneGraph(token, buildingId);
      setSceneGraph(graph);
      setSceneGraphStatus("ready");
    } catch (error) {
      if (handleUnauthorized(error, () => router.push("/sign-in"))) {
        return;
      }

      const status = getAxiosErrorStatus(error);

      if (status === 403) {
        setSceneGraphStatus("forbidden");
        return;
      }

      if (status === 404) {
        setSceneGraphStatus("empty");
        return;
      }

      setSceneGraphStatus("error");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffafa] font-mono text-xs tracking-[0.5em] text-red-900/40">
        INITIALIZING CORE...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fffafa] text-center">
        <AlertTriangle className="h-8 w-8 text-red-600" />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-red-900">{loadError}</p>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#fffafa] p-6 lg:p-12">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-[-10%] top-[-10%] h-[600px] w-[600px] animate-blob rounded-full bg-orange-100/40 mix-blend-multiply blur-3xl filter" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] animate-blob rounded-full bg-red-50/50 mix-blend-multiply blur-3xl filter animation-delay-2000" />
      </div>

      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <filter id="liquid-refraction-emergency">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" />
        </filter>
      </svg>

      <div className="relative z-10 w-full max-w-7xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950 text-white shadow-lg">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-red-900/50">
              SuperSafeTwin
            </p>
            <p className="text-xs text-zinc-500">Home</p>
          </div>
        </Link>

        <header className="mb-10 px-4">
          <div className="border-l-4 border-red-900 pl-6">
            <div className="mb-2 flex items-center gap-3">
              <Compass size={14} className="text-red-800/40" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-red-900/40">
                Emergency Workspace
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900">
              BUILDING <span className="text-red-900/20 [-webkit-text-stroke:1px_#991b1b]">INTELLIGENCE</span>
            </h1>
            {user?.jurisdiction?.name ? (
              <p className="mt-3 text-sm text-zinc-600">관할: {user.jurisdiction.name}</p>
            ) : null}
            <p className="mt-2 max-w-xl text-sm text-zinc-500">
              건물 구조를 살피고 구조 경로를 탐색할 수 있습니다.
            </p>
          </div>
        </header>

        <div className="mb-6 grid min-h-[70vh] grid-cols-1 gap-6 lg:grid-cols-12">
          <div
            className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/60 bg-white/30 shadow-2xl lg:col-span-8"
            style={{
              backdropFilter: "blur(30px) url(#liquid-refraction-emergency)",
              WebkitBackdropFilter: "blur(30px) url(#liquid-refraction-emergency)",
            }}
          >
            <EmbeddedBuildingSceneViewer
              sceneGraph={sceneGraph}
              status={sceneGraphStatus}
              buildingId={selectedBuildingId}
              buildingName={selectedBuilding?.name}
              districtName={selectedBuilding?.district_name}
              enableFacilityTools={false}
            />
          </div>

          <div
            className="flex flex-col gap-6 lg:col-span-4"
          >
            <div
              className="flex flex-1 flex-col rounded-[2rem] border border-white/60 bg-white/20 p-8"
              style={{ backdropFilter: "blur(20px)" }}
            >
              <EmergencyFireNotifications
                pollBuildings={buildings}
                onSceneGraphPoll={handleSceneGraphPoll}
                onSelectBuilding={(buildingId) => void handleSelectBuilding(buildingId)}
                className="mb-6"
              />

              <h3 className="font-black text-xs uppercase italic tracking-[0.3em] text-zinc-400">
                관할 건물
              </h3>

              <div className="mt-6 flex-1 space-y-3 overflow-y-auto pr-1">
                {buildings.length === 0 ? (
                  <div className="rounded-xl border border-red-900/10 bg-white/30 p-5 text-sm text-zinc-500">
                    접근 가능한 건물이 없습니다.
                  </div>
                ) : (
                  sortedBuildings.map((building) => {
                    const fireCount = getBuildingActiveFireCount(building);
                    return (
                      <button
                        key={building.id}
                        type="button"
                        onClick={() => handleSelectBuilding(building.id)}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${selectedBuildingId === building.id
                            ? "border-red-900/40 bg-white/60 shadow-sm"
                            : fireCount > 0
                              ? "border-red-500/35 bg-red-50/40 hover:bg-red-50/60"
                              : "border-red-900/10 bg-white/20 hover:bg-white/40"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Building2 className="mt-0.5 h-4 w-4 text-red-900/50" />
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {fireCount > 0 ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-2 py-1 font-mono text-[9px] font-bold text-white">
                                <Flame className="h-2.5 w-2.5" />
                                화재 {fireCount}
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2 py-1 font-mono text-[9px] ${building.has_scene_graph
                                  ? "bg-red-950 text-white"
                                  : "bg-red-900/10 text-red-900/50"
                                }`}
                            >
                              {building.has_scene_graph ? "GRAPH" : "EMPTY"}
                            </span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm font-bold text-zinc-900">{building.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                          {building.address ?? "주소 정보 없음"}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-8 space-y-5 border-t border-red-950/10 pt-6">
                <MetricRow icon={<Database size={16} />} label="Nodes" value={String(nodeCount)} />
                <MetricRow icon={<Activity size={16} />} label="Edges" value={String(edgeCount)} />
                <MetricRow icon={<Users size={16} />} label="Buildings" value={String(buildings.length)} />
                <MetricRow
                  icon={<Thermometer size={16} />}
                  label="Updated"
                  value={selectedBuilding?.latest_graph_created_at ? "LIVE" : "N/A"}
                />
              </div>

              <div className="mt-8 border-t border-red-950/10 p-4">
                <p className="font-mono text-[9px] uppercase leading-relaxed text-zinc-400">
                  {sceneGraph
                    ? `LATEST GRAPH: ${formatViewerDateTime(sceneGraph.created_at)}`
                    : "Scene graph가 있는 건물을 선택하면 3D 뷰어가 열립니다."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 12s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </main>
  );
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-zinc-400">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xl font-black italic tracking-tighter text-zinc-900">{value}</span>
    </div>
  );
}
