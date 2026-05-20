"use client";

import { completeUpload, requestUploadUrl, uploadFileToPresignedUrl } from "@/app/api/upload";
import type { AuthUser } from "@/app/api/auth";
import { getBuildings, type ViewerBuilding } from "@/app/api/viewer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Compass,
  FileText,
  Gem,
  MapPin,
  UploadCloud,
} from "lucide-react";

type UploadStatus =
  | "idle"
  | "requestingUploadUrl"
  | "uploadingFile"
  | "completingUpload"
  | "success"
  | "error";

const inProgressStatuses: UploadStatus[] = [
  "requestingUploadUrl",
  "uploadingFile",
  "completingUpload",
];

const getUploadErrorMessage = (error: unknown) => {
  const status = (error as { response?: { status?: number } }).response?.status;

  if (status === 502) {
    return "파일 업로드는 완료됐지만 서버의 데이터 변환 단계에서 오류가 발생했습니다. 잠시 후 다시 시도하거나 백엔드 complete_upload 로그를 확인해주세요.";
  }

  if (status) {
    return `업로드 처리 중 서버 오류가 발생했습니다. 상태 코드: ${status}`;
  }

  return "업로드 중 오류가 발생했습니다.";
};

const getRequestedBuildingId = () => {
  if (typeof window === "undefined") return null;

  return new URLSearchParams(window.location.search).get("buildingId");
};

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [buildings, setBuildings] = useState<ViewerBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [isEmergency, setIsEmergency] = useState(false);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId]
  );

  useEffect(() => {
    let isMounted = true;

    const loadUploadContext = async () => {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("currentUser");

      if (!token || !storedUser) {
        alert("로그인이 필요합니다.");
        router.push("/sign-in");
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;

        if (parsedUser.job !== "FACILITY_MANAGER") {
          alert("스캔 업로드는 시설관리자만 사용할 수 있습니다.");
          router.replace("/");
          return;
        }

        const managedBuildings = await getBuildings(token, parsedUser.job);
        const requestedBuildingId = getRequestedBuildingId();
        const defaultBuildingId =
          managedBuildings.find((building) => building.id === requestedBuildingId)?.id ??
          managedBuildings.find((building) => building.id === parsedUser.building?.id)?.id ??
          managedBuildings[0]?.id ??
          null;

        if (!isMounted) return;

        setCurrentUser(parsedUser);
        setBuildings(managedBuildings);
        setSelectedBuildingId(defaultBuildingId);
      } catch (error) {
        console.error("Upload context error:", error);
        if (!isMounted) return;
        alert("업로드 정보를 불러오지 못했습니다. 다시 로그인해주세요.");
        router.push("/sign-in");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUploadContext();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const preventDefault = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const setFile = (file: File) => {
    setSelectedFile(file);
    setUploadStatus("idle");
    setProgress(0);
    setIsEmergency(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    preventDefault(e);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!selectedFile) return;

    const token = localStorage.getItem("accessToken");

    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/sign-in");
      return;
    }

    if (currentUser?.job !== "FACILITY_MANAGER") {
      alert("스캔 업로드는 시설관리자만 사용할 수 있습니다.");
      return;
    }

    if (!selectedBuildingId) {
      alert("업로드할 건물을 선택해주세요.");
      return;
    }

    setUploadStatus("requestingUploadUrl");
    setProgress(15);

    try {
      const uploadConfig = await requestUploadUrl({
        accessToken: token,
        file: selectedFile,
        buildingId: selectedBuildingId,
      });
      setProgress(40);

      setUploadStatus("uploadingFile");
      await uploadFileToPresignedUrl({
        uploadUrl: uploadConfig.upload_url,
        file: selectedFile,
        headers: uploadConfig.headers,
      });
      setProgress(75);

      setUploadStatus("completingUpload");
      await completeUpload({
        accessToken: token,
        taskId: uploadConfig.task_id,
      });
      setProgress(100);
      setUploadStatus("success");
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setIsEmergency(true);
      setProgress(0);
      alert(getUploadErrorMessage(error));
    }
  };

  if (loading) {
    return <div className="p-20 text-center font-mono text-zinc-400">LOADING CORE...</div>;
  }

  return (
    <main
      className={`relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-10 transition-colors duration-1000 ${isEmergency ? "bg-[#ffebeb]" : "bg-[#fffafa]"
        }`}
      onDragOver={preventDefault}
      onDrop={preventDefault}
    >
      <div className="absolute inset-0 z-0">
        <div
          className={`absolute left-[10%] top-[10%] h-[500px] w-[500px] rounded-full mix-blend-multiply blur-3xl transition-all duration-1000 animate-blob ${isEmergency ? "bg-red-300/30" : "bg-orange-200/20"
            }`}
        />
        <div className="absolute right-[5%] top-[40%] h-[600px] w-[600px] rounded-full bg-red-50/40 mix-blend-multiply blur-3xl animate-blob animation-delay-2000" />
        <div
          className={`absolute bottom-[10%] left-[20%] h-[500px] w-[500px] rounded-full mix-blend-multiply blur-3xl transition-all duration-1000 animate-blob animation-delay-4000 ${isEmergency ? "bg-red-400/20" : "bg-red-100/10"
            }`}
        />
      </div>

      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <filter id="liquid-refraction-upload">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" />
        </filter>
      </svg>

      <div
        className="relative z-10 w-full max-w-2xl border border-white/50 bg-white/30 px-6 py-10 shadow-[0_25px_50px_-12px_rgba(220,38,38,0.1)] backdrop-blur-[30px] sm:px-8 sm:py-12"
        style={{
          borderRadius: "2rem",
          backdropFilter: "blur(30px) url(#liquid-refraction-upload)",
          WebkitBackdropFilter: "blur(30px) url(#liquid-refraction-upload)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]" />

        <div className="relative z-20">
          <Link href="/facility" className="mb-8 inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950 text-white shadow-lg">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-red-900/50">
                BIMFree
              </p>
              <p className="text-xs text-zinc-500">Facility</p>
            </div>
          </Link>

          <header
            className={`mb-8 border-l-4 pl-6 transition-colors duration-700 ${isEmergency ? "border-red-600" : "border-red-900"
              }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <Compass
                size={16}
                className={isEmergency ? "text-red-600 animate-spin-slow" : "text-red-800/60"}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-red-900/40">
                Data Acquisition
              </span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-zinc-900">
              Data{" "}
              <span className={isEmergency ? "text-red-600" : "text-red-800/20 [-webkit-text-stroke:1px_#991b1b]"}>
                Upload
              </span>
            </h1>
          </header>

          <div className="mb-6 space-y-3">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-400">
              Upload Target
            </label>
            <div className="rounded-2xl border border-red-900/10 bg-white/35 p-4">
              {buildings.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <Building2 className="h-4 w-4 text-red-900/40" />
                  등록된 건물이 없습니다. 시설 관리 화면에서 건물을 먼저 추가하세요.
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedBuildingId ?? ""}
                    onChange={(event) => setSelectedBuildingId(event.target.value)}
                    disabled={inProgressStatuses.includes(uploadStatus)}
                    className="h-11 w-full rounded-md border border-red-900/10 bg-white/70 px-3 text-sm font-medium text-zinc-900 outline-none transition-[color,box-shadow] focus-visible:border-red-900 focus-visible:ring-[3px] focus-visible:ring-red-900/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>

                  {selectedBuilding && (
                    <div className="flex items-start gap-2 text-xs text-zinc-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-900/50" />
                      <span className="line-clamp-2">
                        {selectedBuilding.address ?? "주소 정보 없음"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-12 transition-all duration-500 ${selectedFile
              ? "border-red-500 bg-red-50/50"
              : "border-red-900/20 bg-white/5 hover:border-red-500"
              }`}
            onClick={() =>
              !inProgressStatuses.includes(uploadStatus) && fileInputRef.current?.click()
            }
            onDragOver={preventDefault}
            onDragEnter={preventDefault}
            onDrop={handleDrop}
          >
            <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
              <div
                className="h-full w-full"
                style={{
                  backgroundImage: "radial-gradient(#991b1b 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
            </div>

            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

            <div className={`mb-6 transition-transform duration-500 ${selectedFile ? "scale-110" : "group-hover:scale-110"}`}>
              {selectedFile ? (
                <FileText className="h-16 w-16 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]" strokeWidth={1} />
              ) : (
                <UploadCloud className="h-16 w-16 text-red-950/40" strokeWidth={1} />
              )}
            </div>

            <p className={`text-center font-mono text-xs tracking-widest transition-colors ${selectedFile ? "font-bold text-red-900" : "text-zinc-400"}`}>
              {selectedFile ? selectedFile.name : "DRAG FILE OR CLICK TO IMPORT"}
            </p>
          </div>

          <div className="mt-10 flex min-h-[80px] flex-col items-center">
            {uploadStatus === "idle" && selectedFile && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedBuildingId}
                className="group relative flex items-center gap-4 bg-red-950 px-12 py-5 font-black uppercase tracking-[0.4em] text-white shadow-xl transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                <span className="text-[10px]">Upload</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
              </button>
            )}

            {inProgressStatuses.includes(uploadStatus) && (
              <div className="w-full space-y-4">
                <div className="flex items-end justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-red-600 animate-pulse">
                    {uploadStatus === "requestingUploadUrl" && "Requesting upload URL..."}
                    {uploadStatus === "uploadingFile" && "Uploading scan file..."}
                    {uploadStatus === "completingUpload" && "Transforming scene graph..."}
                  </span>
                  <span className="font-mono text-xs font-bold text-red-900">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-red-900/10">
                  <div
                    className="h-full bg-red-600 shadow-[0_0_10px_#ef4444] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadStatus === "success" && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="mb-4 rounded-full bg-red-600 p-4 shadow-[0_0_20px_#ef4444]">
                  <Gem className="h-6 w-6 text-white" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-900">
                  Extraction Complete
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadStatus("idle");
                    setIsEmergency(false);
                    setProgress(0);
                  }}
                  className="mt-4 font-mono text-[9px] uppercase tracking-widest text-zinc-400 underline transition-colors hover:text-red-600"
                >
                  Select New Fragment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-10 right-10 select-none text-[10rem] font-black uppercase text-red-900/[0.03]">
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
