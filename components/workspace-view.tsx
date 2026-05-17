"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Activity,
  Building2,
  Compass,
  Database,
  Gem,
  Loader2,
  Maximize2,
  Thermometer,
  Users,
} from "lucide-react";
import {
  getBuildingSceneGraph,
  getWorkspace,
  type SceneGraph,
  type ViewerBuilding,
} from "@/app/api/viewer";
import type { AuthUser, UserJob } from "@/app/api/auth";

type SceneGraphStatus = "idle" | "loading" | "ready" | "empty" | "forbidden" | "error";

const getErrorStatus = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  return undefined;
};

const formatCoordinate = (value: number | null | undefined, suffix: "N" | "E") => {
  if (typeof value !== "number") return "N/A";

  return `${value.toFixed(4)}° ${suffix}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getStoredUserJob = (): UserJob | null => {
  const currentUser = localStorage.getItem("currentUser");

  if (!currentUser) return null;

  try {
    return (JSON.parse(currentUser) as AuthUser).job ?? null;
  } catch {
    return null;
  }
};

export default function ViewerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [buildings, setBuildings] = useState<ViewerBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [sceneGraph, setSceneGraph] = useState<SceneGraph | null>(null);
  const [sceneGraphStatus, setSceneGraphStatus] = useState<SceneGraphStatus>("idle");
  const [userJob, setUserJob] = useState<UserJob | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId]
  );

  const nodeCount = sceneGraph?.scene_graph.nodes?.length ?? 0;
  const edgeCount = sceneGraph?.scene_graph.edges?.length ?? 0;
  const workspaceTitle = userJob === "FIREFIGHTER" ? "BUILDING INTELLIGENCE" : "FACILITY MANAGEMENT";
  const workspaceEyebrow = userJob === "FIREFIGHTER" ? "Emergency Workspace" : "Facility Workspace";

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("accessToken");

    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/sign-in");
      return;
    }

    const storedJob = getStoredUserJob();
    setUserJob(storedJob);

    const loadBootstrap = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const data = await getWorkspace(token, storedJob);

        if (!isMounted) return;

        const defaultBuildingId = data.default_building_id ?? data.buildings[0]?.id ?? null;

        setBuildings(data.buildings);
        setSelectedBuildingId(defaultBuildingId);
        setSceneGraph(data.default_scene_graph);

        if (data.buildings.length === 0) {
          setSceneGraphStatus("idle");
        } else {
          setSceneGraphStatus(data.default_scene_graph ? "ready" : "empty");
        }
      } catch (error) {
        if (!isMounted) return;

        if (getErrorStatus(error) === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("currentUser");
          window.dispatchEvent(new Event("auth-state-changed"));
          alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
          router.push("/sign-in");
          return;
        }

        setLoadError("뷰어 데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBootstrap();

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

    try {
      const graph = await getBuildingSceneGraph(token, buildingId, userJob);
      setSceneGraph(graph);
      setSceneGraphStatus("ready");
    } catch (error) {
      const status = getErrorStatus(error);

      if (status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("currentUser");
        window.dispatchEvent(new Event("auth-state-changed"));
        alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
        router.push("/sign-in");
        return;
      }

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
      <div className="min-h-screen bg-[#fffafa] flex items-center justify-center font-mono text-xs tracking-[0.5em] text-red-900/40">
        INITIALIZING CORE...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#fffafa] flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-600" />
        <p className="font-mono text-xs tracking-[0.3em] text-red-900 uppercase">{loadError}</p>
      </div>
    );
  }

  return (
    <main
      className={`relative min-h-screen flex flex-col items-center justify-center p-6 lg:p-12 transition-colors duration-1000 overflow-hidden ${
        isEmergency ? "bg-[#ffebeb]" : "bg-[#fffafa]"
      }`}
    >
      <div className="absolute inset-0 z-0">
        <div
          className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl animate-blob transition-all duration-1000 ${
            isEmergency ? "bg-red-300/30" : "bg-orange-100/40"
          }`}
        />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-red-50/50 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      </div>

      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <filter id="liquid-refraction-viewer">
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
              BIMFree
            </p>
            <p className="text-xs text-zinc-500">Home</p>
          </div>
        </Link>
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div className="border-l-4 border-red-900 pl-6">
            <div className="flex items-center gap-3 mb-2">
              <Compass size={14} className={isEmergency ? "text-red-600 animate-spin-slow" : "text-red-800/40"} />
              <span className="font-mono text-[10px] tracking-[0.4em] text-red-900/40 uppercase font-bold">
                {workspaceEyebrow}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900">
              {workspaceTitle.split(" ")[0]}{" "}
              <span className={isEmergency ? "text-red-600" : "text-red-900/20 [-webkit-text-stroke:1px_#991b1b]"}>
                {workspaceTitle.split(" ").slice(1).join(" ")}
              </span>
            </h1>
          </div>

          <button
            onClick={() => setIsEmergency(!isEmergency)}
            className={`px-8 py-3 font-mono text-[10px] tracking-[0.3em] uppercase transition-all border ${
              isEmergency
                ? "bg-red-600 text-white border-red-400 shadow-[0_0_20px_#ef4444]"
                : "bg-white/50 backdrop-blur-md border-red-900/20 text-red-900 hover:bg-red-950 hover:text-white"
            }`}
          >
            {isEmergency ? "Emergency Protocol: ON" : "Activate Response"}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[70vh]">
          <div
            className="lg:col-span-8 relative rounded-[2rem] border border-white/60 bg-white/30 overflow-hidden shadow-2xl min-h-[520px]"
            style={{
              backdropFilter: "blur(30px) url(#liquid-refraction-viewer)",
              WebkitBackdropFilter: "blur(30px) url(#liquid-refraction-viewer)",
            }}
          >
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start gap-4">
                <div className="p-4 border border-red-900/10 bg-white/20 backdrop-blur-md max-w-md">
                  <span className="block font-mono text-[8px] text-zinc-400 mb-1">SELECTED BUILDING</span>
                  <span className="block font-mono text-xs text-red-900 font-bold tracking-widest truncate">
                    {selectedBuilding?.name ?? "NO BUILDING"}
                  </span>
                  <span className="mt-2 block font-mono text-[10px] text-red-900/60">
                    {formatCoordinate(selectedBuilding?.latitude, "N")},{" "}
                    {formatCoordinate(selectedBuilding?.longitude, "E")}
                  </span>
                </div>
                <Maximize2 size={20} className="text-zinc-300 hover:text-red-600 cursor-pointer transition-colors" />
              </div>

              <SceneGraphState status={sceneGraphStatus} nodeCount={nodeCount} edgeCount={edgeCount} />

              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className={`h-1 w-32 ${isEmergency ? "bg-red-600" : "bg-red-900/20"}`} />
                  <p className="font-mono text-[10px] text-red-900/60 uppercase tracking-widest">
                    {selectedBuilding?.district_name ?? "No district"} /{" "}
                    {sceneGraph ? `Graph ${sceneGraph.graph_data_id.slice(0, 8)}` : "Graph pending"}
                  </p>
                </div>
                <Gem size={48} strokeWidth={0.5} className={isEmergency ? "text-red-600 animate-pulse" : "text-red-900/10"} />
              </div>
            </div>

            <div className={`w-full h-full ${isEmergency ? "bg-red-950/10" : "bg-zinc-100/20"}`} />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div
              className="flex-1 rounded-[2rem] border border-white/60 bg-white/20 p-8 flex flex-col"
              style={{ backdropFilter: "blur(20px)" }}
            >
              <h3 className="font-black text-xs tracking-[0.3em] uppercase text-zinc-400 mb-6 italic">
                Building Access
              </h3>

              <div className="space-y-3 overflow-y-auto pr-1">
                {buildings.length === 0 ? (
                  <div className="rounded-xl border border-red-900/10 bg-white/30 p-5 text-sm text-zinc-500">
                    접근 가능한 건물이 없습니다.
                  </div>
                ) : (
                  buildings.map((building) => (
                    <button
                      key={building.id}
                      type="button"
                      onClick={() => handleSelectBuilding(building.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        selectedBuildingId === building.id
                          ? "border-red-900/40 bg-white/60 shadow-sm"
                          : "border-red-900/10 bg-white/20 hover:bg-white/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Building2 className="mt-0.5 h-4 w-4 text-red-900/50" />
                        <span
                          className={`rounded-full px-2 py-1 font-mono text-[9px] ${
                            building.has_scene_graph
                              ? "bg-red-950 text-white"
                              : "bg-red-900/10 text-red-900/50"
                          }`}
                        >
                          {building.has_scene_graph ? "GRAPH" : "EMPTY"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-bold text-zinc-900">{building.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{building.address ?? "주소 정보 없음"}</p>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-8 space-y-5 border-t border-red-950/10 pt-6">
                <MetricRow
                  icon={<Database size={16} />}
                  label="Nodes"
                  value={String(nodeCount)}
                  color={isEmergency ? "text-red-600" : "text-zinc-900"}
                />
                <MetricRow
                  icon={<Activity size={16} />}
                  label="Edges"
                  value={String(edgeCount)}
                  color={isEmergency ? "text-red-600" : "text-zinc-900"}
                />
                <MetricRow
                  icon={<Users size={16} />}
                  label="Buildings"
                  value={String(buildings.length)}
                  color={isEmergency ? "text-red-600" : "text-zinc-900"}
                />
                <MetricRow
                  icon={<Thermometer size={16} />}
                  label="Updated"
                  value={selectedBuilding?.latest_graph_created_at ? "LIVE" : "N/A"}
                  color={isEmergency ? "text-red-600" : "text-zinc-900"}
                />
              </div>

              <div className={`mt-8 p-4 border-t transition-colors ${isEmergency ? "border-red-500/30" : "border-red-950/10"}`}>
                <p className="text-[9px] font-mono text-zinc-400 leading-relaxed uppercase">
                  {sceneGraph
                    ? `LATEST GRAPH: ${formatDate(sceneGraph.created_at)}`
                    : "Select a building with scene graph data to initialize the viewer."}
                </p>
              </div>
            </div>

            {userJob === "FACILITY_MANAGER" && (
              <button
                type="button"
                onClick={() => router.push("/upload")}
                className="h-20 bg-red-950 text-white flex items-center justify-between px-8 rounded-[1.5rem] hover:bg-black transition-all group"
              >
                <span className="font-mono text-[10px] tracking-[0.5em] uppercase font-bold">Upload Scan</span>
                <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="absolute left-10 top-1/2 -translate-y-1/2 font-black text-[12rem] text-red-900/[0.02] select-none pointer-events-none rotate-90 uppercase">
        Facet
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-blob {
          animation: blob 12s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </main>
  );
}

function SceneGraphState({
  status,
  nodeCount,
  edgeCount,
}: {
  status: SceneGraphStatus;
  nodeCount: number;
  edgeCount: number;
}) {
  if (status === "loading") {
    return (
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 font-mono text-xs tracking-[0.3em] text-red-900/50">
        <Loader2 className="h-5 w-5 animate-spin" />
        LOADING GRAPH
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-900/10 bg-white/30 p-6 text-center backdrop-blur-md">
        <Database className="mx-auto mb-4 h-8 w-8 text-red-900/40" />
        <p className="font-mono text-[10px] tracking-[0.4em] text-red-900/40">SCENE GRAPH</p>
        <p className="mt-3 text-3xl font-black text-zinc-900">
          {nodeCount}
          <span className="text-sm text-zinc-400"> / {edgeCount}</span>
        </p>
        <p className="mt-1 font-mono text-[9px] text-zinc-400">NODES / EDGES</p>
      </div>
    );
  }

  const message =
    status === "forbidden"
      ? "해당 건물 접근 권한이 없습니다."
      : status === "error"
        ? "Scene graph를 불러오지 못했습니다."
        : "이 건물에는 아직 scene graph가 없습니다.";

  return (
    <div className="absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-900/10 bg-white/30 p-6 text-center backdrop-blur-md">
      <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-900/40" />
      <p className="text-sm font-bold text-zinc-700">{message}</p>
    </div>
  );
}

function MetricRow({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-zinc-400">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</span>
    </div>
  );
}
