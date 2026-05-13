"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, ShieldAlert } from "lucide-react";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  if (!mounted) return null;

  return (
    <section className={`relative min-h-screen flex flex-col justify-center items-center overflow-hidden transition-colors duration-1000 ${
      // 평상시에도 아주 연한 붉은 기가 도는 아이보리 배경 사용
      isEmergency ? "bg-[#ffebeb]" : "bg-[#fffafa]" 
    }`}>

      {/* 1. Liquid Glass 배경: 평상시에도 레드/오렌지 톤의 따뜻한 감성 유지 */}
      <div className="absolute inset-0 z-0">
        {/* 첫 번째 블롭: 세이프티 오렌지 -> 강렬한 레드 */}
        <div className={`absolute top-[20%] left-[20%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-blob transition-all duration-1000 ${
          isEmergency ? "bg-red-400/40" : "bg-orange-200/30"
        }`} />

        {/* 두 번째 블롭: 고정적인 중성 톤 (깊이감 부여) */}
        <div className="absolute top-[30%] right-[20%] w-96 h-96 bg-red-50/50 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />

        {/* 세 번째 블롭: 연한 핑크 -> 선명한 핑크/레드 */}
        <div className={`absolute bottom-[20%] left-[30%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000 transition-all duration-1000 ${
          isEmergency ? "bg-red-300/40" : "bg-red-100/20"
        }`} />
      </div>

      {/* 2. 물리적 굴절 SVG 필터 */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <filter id="liquid-refraction">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="25" />
        </filter>
      </svg>

      {/* 3. 메인 Liquid Glass 카드 */}
      <div
        className={`relative z-10 w-full max-w-5xl mx-auto px-10 py-20  
        transition-all duration-1000 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
        
        bg-white/30 backdrop-blur-[30px] 
        border border-white/50 rounded-[3rem] 
        shadow-[0_25px_50px_-12px_rgba(220,38,38,0.08)]
        `}
        style={{
          backdropFilter: "blur(30px) url(#liquid-refraction)",
          WebkitBackdropFilter: "blur(30px) url(#liquid-refraction)"
        }}
      >
        {/* 내부 광택(Rim Light) */}
        <div className="absolute inset-0 rounded-[3rem] border border-white/60 pointer-events-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]" />

        <div className="relative z-20">
          <header className={`border-l-4 transition-colors duration-700 pl-10 ${
            isEmergency ? "border-red-600" : "border-red-900"
          }`}>
            <div className="flex items-center gap-3 mb-8">
              <Compass
                size={18}
                className={`transition-all duration-700 ${isEmergency ? "text-red-600 animate-spin-slow" : "text-red-800/60"}`}
              />
              <span className="font-mono text-[10px] tracking-[0.5em] text-red-900/40 uppercase">
                Structural Integrity
              </span>
            </div>

            <h2 className="text-6xl lg:text-[10rem] font-light tracking-tighter leading-[0.85] mb-12 text-zinc-900">
              DATA <br />
              <span className={`font-black transition-all duration-1000 ${
                isEmergency 
                  ? "text-red-600 drop-shadow-[0_10px_20px_rgba(220,38,38,0.2)]" 
                  : "text-red-50/10 [-webkit-text-stroke:1.5px_#991b1b]" // 평상시에도 레드 테두리 적용
              }`}>
                TO Safety.
              </span>
            </h2>

            <p className="max-w-md text-sm lg:text-base text-zinc-500 leading-relaxed font-medium mb-12">
              시설물 업로드부터 긴급 대응까지, <br />
              3D HSSG(Hierachical Semantic Scene Graph)기술이 <br />
              건축물 관리와 소방 대응의 패러다임을 바꿉니다.
            </p>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsEmergency(!isEmergency)}
                size="lg"
                className={`rounded-full px-10 h-16 transition-all duration-500 font-bold tracking-widest text-xs uppercase ${
                  isEmergency 
                    ? "bg-red-600 text-white shadow-[0_15px_30px_rgba(220,38,38,0.3)] hover:bg-red-700" 
                    : "bg-red-700 text-white hover:scale-105 shadow-xl hover:bg-black"
                }`}
              >
                {isEmergency ? (
                  <> <ShieldAlert className="mr-2 w-4 h-4" /> Terminate Protocol </>
                ) : (
                  <> Initiate Protocol <ArrowRight className="ml-2 w-4 h-4" /> </>
                )}
              </Button>

              <div className="hidden sm:block">
                <span className={`font-mono text-[9px] tracking-widest uppercase transition-colors ${
                  isEmergency ? "text-red-400 font-bold" : "text-red-900/30"
                }`}>
                  Core Stability: 100% // Mode: {isEmergency ? "Tactical" : "Active"}
                </span>
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* 배경 장식: 층수 인디케이터 (항상 레드 톤 유지) */}
      <div className={`absolute right-10 bottom-10 font-black text-[12rem] transition-colors duration-1000 select-none pointer-events-none ${
        isEmergency ? "text-red-600/10" : "text-red-900/[0.03]"
      }`}>
        {isEmergency ? "B1" : "01"}
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
          animation: blob 10s infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
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