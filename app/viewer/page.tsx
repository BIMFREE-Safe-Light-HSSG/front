"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  ShieldAlert,
  Gem,
  Maximize2,
  Activity,
  Users,
  Thermometer,
  ArrowRight
} from "lucide-react";

export default function ViewerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEmergency, setIsEmergency] = useState(false);

const SAMPLE_URL = "/api/pointcloud-sample"

const FacilityPointCloudDeck = dynamic(
  () =>
    import("@/components/facility-viewer/FacilityPointCloudDeck").then((m) => m.FacilityPointCloudDeck),
  { ssr: false },
)

export default function FacilityViewerPage() {
  const [cloud, setCloud] = useState<FacilityPointCloud | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadBundledSample = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(SAMPLE_URL, { cache: "no-store", signal })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `${res.status} ${res.statusText}`)
    }
    const buf = await res.arrayBuffer()
    return parseFacilityPointCloudNpy(buf, {
      meta: { fileName: "processed_pointcloud.npy", source: "app/api sample" },
    })
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    setBusy(true)
    setError(null)
    loadBundledSample(ac.signal)
      .then((c) => {
        if (!ac.signal.aborted) {
          setCloud(c)
        }
      })
      .catch((e) => {
        if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
          return
        }
        setCloud(null)
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setBusy(false)
        }
      })
    return () => ac.abort()
  }, [loadBundledSample])

  if (loading) return (
    <div className="min-h-screen bg-[#fffafa] flex items-center justify-center font-mono text-xs tracking-[0.5em] text-red-900/40">
      INITIALIZING CORE...
    </div>
  );

  return (
    <main className={`relative min-h-screen flex flex-col items-center justify-center p-6 lg:p-12 transition-colors duration-1000 overflow-hidden ${
      isEmergency ? "bg-[#ffebeb]" : "bg-[#fffafa]"
    }`}>

      {/* 1. Liquid Glass 배경 Blobs */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl animate-blob transition-all duration-1000 ${
          isEmergency ? "bg-red-300/30" : "bg-orange-100/40"
        }`} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-red-50/50 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      </div>

      {/* 2. 물리적 굴절 SVG 필터 */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <filter id="liquid-refraction-viewer">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" />
        </filter>
      </svg>

      <div className="relative z-10 w-full max-w-7xl">

        {/* 상단 타이틀 바 */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div className="border-l-4 border-red-900 pl-6">
            <div className="flex items-center gap-3 mb-2">
              <Compass size={14} className={isEmergency ? "text-red-600 animate-spin-slow" : "text-red-800/40"} />
              <span className="font-mono text-[10px] tracking-[0.4em] text-red-900/40 uppercase font-bold">Spatial Intelligence</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900">
              FACET <span className={isEmergency ? "text-red-600" : "text-red-900/20 [-webkit-text-stroke:1px_#991b1b]"}>VIEWER</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[70vh]">

          {/* 3. 메인 뷰어 영역 (Liquid Glass Pane) */}
          <div
            className="lg:col-span-8 relative rounded-[2rem] border border-white/60 bg-white/30 overflow-hidden shadow-2xl"
            style={{
              backdropFilter: "blur(30px) url(#liquid-refraction-viewer)",
              WebkitBackdropFilter: "blur(30px) url(#liquid-refraction-viewer)"
            }}
          >
            {/* 내부 뷰어 오버레이 요소 */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="p-4 border border-red-900/10 bg-white/20 backdrop-blur-md">
                  <span className="block font-mono text-[8px] text-zinc-400 mb-1">COORDINATES</span>
                  <span className="font-mono text-xs text-red-900 font-bold tracking-widest">37.5665° N, 126.9780° E</span>
                </div>
                <Maximize2 size={20} className="text-zinc-300 hover:text-red-600 cursor-pointer transition-colors" />
              </div>

              {/* 중앙 조준점 (Crosshair) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className={`w-20 h-20 border transition-all duration-700 ${isEmergency ? "border-red-600 rotate-45 scale-125" : "border-red-900/20"}`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full ${isEmergency ? "bg-red-600" : "bg-red-900/40"}`} />
              </div>

              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className={`h-1 w-32 ${isEmergency ? "bg-red-600" : "bg-red-900/20"}`} />
                  <p className="font-mono text-[10px] text-red-900/60 uppercase tracking-widest">Scanning Floor_03_Sector_B</p>
                </div>
                <Gem size={48} strokeWidth={0.5} className={isEmergency ? "text-red-600 animate-pulse" : "text-red-900/10"} />
              </div>
            </div>

            {/* 실제 3D 렌더링이 들어갈 Placeholder */}
            <div className={`w-full h-full ${isEmergency ? "bg-red-950/10" : "bg-zinc-100/20"}`} />
          </div>

          {/* 4. 사이드 제어 패널 (Structural Data) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div
              className="flex-1 rounded-[2rem] border border-white/60 bg-white/20 p-8 flex flex-col justify-between"
              style={{ backdropFilter: "blur(20px)" }}
            >
              <h3 className="font-black text-xs tracking-[0.3em] uppercase text-zinc-400 mb-6 italic">Vital Metrics</h3>

              <div className="space-y-8">
                <MetricRow icon={<Activity size={16}/>} label="System Load" value="12.4ms" color={isEmergency ? "text-red-600" : "text-zinc-900"} />
                <MetricRow icon={<Users size={16}/>} label="Occupancy" value="128 P" color={isEmergency ? "text-red-600" : "text-zinc-900"} />
                <MetricRow icon={<Thermometer size={16}/>} label="Core Temp" value="22.4°C" color={isEmergency ? "text-red-600 text-bold" : "text-zinc-900"} />
              </div>

              <div className={`mt-8 p-4 border-t transition-colors ${isEmergency ? "border-red-500/30" : "border-red-950/10"}`}>
                <p className="text-[9px] font-mono text-zinc-400 leading-relaxed uppercase">
                  {isEmergency ? "Warning: High temperature detected in Sector B. Evacuation routes optimized." : "All systems nominal. Diamond core structure maintaining optimal stability."}
                </p>
              </div>
            </div>

            {/* 바로가기 버튼 */}
            <button className="h-20 bg-red-950 text-white flex items-center justify-between px-8 rounded-[1.5rem] hover:bg-black transition-all group">
              <span className="font-mono text-[10px] tracking-[0.5em] uppercase font-bold">Go To Dashboard</span>
              <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* 배경 장식 */}
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

function MetricRow({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
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
