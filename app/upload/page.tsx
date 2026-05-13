"use client";

import { upload } from "@/app/api/upload";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, ShieldAlert, Gem, UploadCloud, FileText } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [isEmergency, setIsEmergency] = useState(false); // 배경 테마 연동을 위한 상태

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/sign-in");
    } else {
      setLoading(false);
    }
  }, [router]);

  const preventDefault = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    preventDefault(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadStatus("idle");
      setProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus("idle");
      setProgress(0);
    }
  };

  const handleUpload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadStatus("uploading");
    setProgress(15);

    try {
      const uploadConfig = await upload(selectedFile);
      setProgress(40);

      const uploadResponse = await fetch(uploadConfig.upload_url, {
        method: uploadConfig.method || "PUT",
        headers: { ...uploadConfig.headers },
        body: selectedFile,
      });

      if (!uploadResponse.ok) throw new Error("Minio 전송 실패");

      setProgress(100);
      setUploadStatus("success");
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setIsEmergency(true); // 에러 발생 시 배경을 긴급 모드로 변경
      setProgress(0);
      alert("업로드 중 오류가 발생했습니다.");
    }
  };

  if (loading) return <div className="p-20 text-center font-mono text-zinc-400">LOADING CORE...</div>;

  return (
    <main
      className={`relative min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-1000 ${
        isEmergency ? "bg-[#ffebeb]" : "bg-[#fffafa]"
      }`}
      onDragOver={preventDefault}
      onDrop={preventDefault}
    >
      {/* 1. Liquid Glass 배경 Blobs */}
      <div className="absolute inset-0 z-0">
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
        <filter id="liquid-refraction-upload">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" />
        </filter>
      </svg>

      {/* 3. 메인 Liquid Glass 업로드 카드 */}
      <div
        className={`relative z-10 w-full max-w-2xl mx-auto px-8 py-12 transition-all duration-1000
        bg-white/30 backdrop-blur-[30px] border border-white/50 rounded-[3rem] shadow-[0_25px_50px_-12px_rgba(220,38,38,0.1)]`}
        style={{
          backdropFilter: "blur(30px) url(#liquid-refraction-upload)",
          WebkitBackdropFilter: "blur(30px) url(#liquid-refraction-upload)"
        }}
      >
        {/* 내부 광택(Rim Light) */}
        <div className="absolute inset-0 rounded-[3rem] border border-white/60 pointer-events-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]" />

        <div className="relative z-20">
          <header className={`border-l-4 transition-colors duration-700 pl-6 mb-10 ${
            isEmergency ? "border-red-600" : "border-red-900"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <Compass size={16} className={isEmergency ? "text-red-600 animate-spin-slow" : "text-red-800/60"} />
              <span className="font-mono text-[10px] tracking-[0.4em] text-red-900/40 uppercase font-bold">Data Acquisition</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase">
              Raw <span className={isEmergency ? "text-red-600" : "text-red-800/20 [-webkit-text-stroke:1px_#991b1b]"}>Extraction</span>
            </h1>
          </header>

          {/* 드롭 존 (건축적 결정 구조 느낌) */}
          <div
            className={`relative group border-2 border-dashed rounded-3xl p-12 transition-all duration-500 flex flex-col items-center justify-center overflow-hidden
              ${selectedFile ? 'border-red-500 bg-red-50/50' : 'border-red-900/20 hover:border-red-500 bg-white/5 cursor-pointer'}`}
            onClick={() => uploadStatus !== "uploading" && fileInputRef.current?.click()}
            onDragOver={preventDefault}
            onDragEnter={preventDefault}
            onDrop={handleDrop}
          >
            {/* 배경 다이아몬드 패턴 */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(#991b1b 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            </div>

            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

            <div className={`mb-6 transition-transform duration-500 ${selectedFile ? 'scale-110' : 'group-hover:scale-110'}`}>
              {selectedFile ? (
                <FileText className="w-16 h-16 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]" strokeWidth={1} />
              ) : (
                <UploadCloud className="w-16 h-16 text-red-950/40" strokeWidth={1} />
              )}
            </div>

            <p className={`font-mono text-xs tracking-widest text-center transition-colors ${selectedFile ? 'text-red-900 font-bold' : 'text-zinc-400'}`}>
              {selectedFile ? selectedFile.name : "DRAG FILMENT OR CLICK TO IMPORT"}
            </p>
          </div>

          {/* 하단 컨트롤 및 프로그레스 */}
          <div className="mt-10 min-h-[80px] flex flex-col items-center">
            {uploadStatus === "idle" && selectedFile && (
              <button
                type="button"
                onClick={handleUpload}
                className="group relative flex items-center gap-4 px-12 py-5 bg-red-950 text-white font-black text-[10px] tracking-[0.4em] uppercase hover:bg-black transition-all shadow-xl active:scale-95"
              >
                Initiate Protocol <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
            )}

            {uploadStatus === "uploading" && (
              <div className="w-full space-y-4">
                <div className="flex justify-between items-end">
                  <span className="font-mono text-[10px] text-red-600 animate-pulse tracking-widest uppercase">Crystallizing...</span>
                  <span className="font-mono text-xs text-red-900 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-red-900/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-500 shadow-[0_0_10px_#ef4444]"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {uploadStatus === "success" && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-red-600 rounded-full mb-4 shadow-[0_0_20px_#ef4444]">
                  <Gem className="w-6 h-6 text-white" />
                </div>
                <p className="text-red-900 font-black text-xs tracking-[0.3em] uppercase">Extraction Complete</p>
                <button
                  type="button"
                  onClick={() => {setSelectedFile(null); setUploadStatus("idle"); setIsEmergency(false);}}
                  className="mt-4 text-zinc-400 hover:text-red-600 font-mono text-[9px] tracking-widest uppercase underline transition-colors"
                >
                  Select New Fragment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 배경 장식: 층수 인디케이터 (데이터 유입 상징) */}
      <div className="absolute right-10 bottom-10 font-black text-[10rem] text-red-900/[0.03] select-none pointer-events-none uppercase">
        Inp
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
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </main>
  );
}