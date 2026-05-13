"use client";

import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Database,
  Building2,
  Users,
  ShieldAlert,
  ArrowRight,
  Compass,
  Gem,
  Hexagon
} from "lucide-react";

const roadmapFeatures = [
  {
    floor: "01F",
    title: "Data Acquisition",
    description: "지상 1층: 모든 데이터의 진입점. 시설 관리자가 현장의 2D Scan 데이터를 업로드하여 디지털 기반을 다집니다.",
    visual: "upload",
    status: "ENTRY_LEVEL"
  },
  {
    floor: "02F",
    title: "3D-HSSG Generation",
    description: "데이터 프로세싱 층. AI가 정밀한 Digital Twin을 생성하여 건물의 가상 골조를 완성합니다.",
    visual: "generate",
    status: "CORE_BUILDING"
  },
  {
    floor: "03F",
    title: "Facility Management",
    description: "운영 및 관리 층. 생성된 뷰어를 통해 건물 내부의 배관, 설비 등 보이지 않는 영역을 입체적으로 관리합니다.",
    visual: "manage",
    status: "OPERATIONAL"
  },
  {
    floor: "04F",
    title: "Strategic Sharing",
    description: "협력 및 공유 층. 관제 데이터를 소방 대응팀과 실시간 공유하여 입체적인 재난 대비망을 구축합니다.",
    visual: "share",
    status: "NETWORK_STABLE"
  },
  {
    floor: "EVAC",
    title: "Emergency Protocol",
    description: "최상층/비상 제어. 화재 발생 시 즉각 재난 모드로 전환되어 생존을 위한 최적의 데이터를 출력합니다.",
    visual: "emergency",
    status: "CRITICAL_PATH"
  },
];

// 수정된 StepVisual: 활성화(isActive) 시 무조건 흰색 선으로 표시
function StepVisual({ type, isEmergency, isActive }: { type: string; isEmergency: boolean; isActive: boolean }) {
  const baseClass = `w-12 h-12 transition-all duration-700 ${isActive ? "scale-110 opacity-100" : "scale-100 opacity-20"}`;

  // 핵심 수정: isActive일 때 text-white를 적용하여 갈색 배경 위에서 흰색 선이 보이게 함
  const colorClass = isActive
    ? "text-white"
    : isEmergency
    ? "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
    : "text-red-950";

  switch (type) {
    case "upload": return <UploadCloud className={`${baseClass} ${colorClass}`} strokeWidth={1} />;
    case "generate": return <Database className={`${baseClass} ${colorClass}`} strokeWidth={1} />;
    case "manage": return <Building2 className={`${baseClass} ${colorClass}`} strokeWidth={1} />;
    case "share": return <Users className={`${baseClass} ${colorClass}`} strokeWidth={1} />;
    case "emergency": return <ShieldAlert className={`${baseClass} ${isActive ? "text-white" : isEmergency ? "text-red-600 animate-pulse" : "text-red-950"}`} strokeWidth={1.5} />;
    default: return <Hexagon className={`${baseClass} ${colorClass}`} strokeWidth={1} />;
  }
}

export function FeaturesSection() {
  const [isEmergency, setIsEmergency] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="features" className={`relative min-h-screen py-32 lg:py-48 transition-colors duration-1000 overflow-hidden ${
      isEmergency ? "bg-[#ffebeb]" : "bg-[#fffafa]"
    }`}>

      {/* 1. Liquid Blobs 배경 (HeroSection과 동일) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={`absolute top-[10%] left-[10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl animate-blob transition-all duration-1000 ${
          isEmergency ? "bg-red-300/30" : "bg-orange-200/20"
        }`} />
        <div className="absolute top-[40%] right-[5%] w-[600px] h-[600px] bg-red-50/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className={`absolute bottom-[10%] left-[20%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000 transition-all duration-1000 ${
          isEmergency ? "bg-red-400/20" : "bg-red-100/10"
        }`} />
      </div>

      {/* 2. 물리적 굴절 SVG 필터 */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <filter id="liquid-refraction-features">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" />
        </filter>
      </svg>

      <div className="max-w-6xl mx-auto px-8 relative z-10 w-full">


        {/* 로드맵 리스트: 유리 패널 구조 */}
        <div className="space-y-4 border-t border-red-900/10 pt-10">
          {roadmapFeatures.map((feature, index) => (
            <div
              key={feature.floor}
              onMouseEnter={() => setActiveIndex(index)}
              className={`group relative grid lg:grid-cols-12 items-center py-10 lg:py-16 px-8 transition-all duration-700 border border-white/40 shadow-sm ${
                activeIndex === index 
                  ? (isEmergency ? "bg-red-500/20 backdrop-blur-xl scale-[1.02] border-red-200" : "bg-white/40 backdrop-blur-xl scale-[1.02] border-white/60") 
                  : "bg-white/5 backdrop-blur-sm opacity-60"
              }`}
              style={{ backdropFilter: activeIndex === index ? "blur(30px) url(#liquid-refraction-features)" : "none" }}
            >
              <div className="lg:col-span-1 font-mono text-xs font-bold text-red-900/30">
                {feature.floor}
              </div>

              <div className="lg:col-span-7">
                <h3 className={`text-3xl lg:text-5xl font-bold tracking-tight mb-4 transition-colors ${
                  activeIndex === index ? (isEmergency ? "text-red-600" : "text-red-950") : "text-red-900/20"
                }`}>
                  {feature.title}
                </h3>
                <div className={`transition-all duration-700 ${activeIndex === index ? "opacity-100 translate-x-0 h-auto" : "opacity-0 -translate-x-4 h-0 overflow-hidden"}`}>
                  <p className="text-zinc-500 text-sm max-w-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-4 flex justify-end">
                {/* 아이콘 박스: 호버 시 bg-red-950(갈색 톤) 적용 */}
                <div className={`p-8 transition-all duration-700 rounded-full ${
                  activeIndex === index ? "bg-red-950 shadow-2xl scale-110" : "bg-transparent"
                }`}>
                  <StepVisual
                    type={feature.visual}
                    isEmergency={isEmergency}
                    isActive={activeIndex === index}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 제어부 */}
        <div className="mt-32 flex flex-col items-end">
          <button
            onClick={() => setIsEmergency(!isEmergency)}
            className={`group relative flex items-center gap-6 px-12 py-6 transition-all duration-700 border border-white/60 backdrop-blur-md shadow-lg ${
              isEmergency ? "bg-red-600 text-white" : "bg-red-950 text-white hover:bg-black"
            }`}
          >
            <span className="font-mono text-xs tracking-[0.4em] uppercase font-bold">
              {isEmergency ? "Protocol Alpha Active" : "Initiate Red Protocol"}
            </span>
            <div className={`transition-transform duration-500 ${isEmergency ? "rotate-90" : "group-hover:translate-x-2"}`}>
              <ArrowRight size={18} />
            </div>
            <div className="absolute -bottom-2 -right-2 w-full h-full border border-red-900/10 -z-10 group-hover:bottom-0 group-hover:right-0 transition-all" />
          </button>

          <div className="mt-8 flex gap-8 font-mono text-[9px] text-red-900/40 tracking-[0.2em]">
             <div className="flex items-center gap-2">
                <Gem size={10} className={isEmergency ? "text-red-600 animate-pulse" : ""} />
                <span>STRUCTURE: CRYSTALLIZED</span>
             </div>
             <span>STABILITY: UNBREAKABLE</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-blob {
          animation: blob 15s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
}