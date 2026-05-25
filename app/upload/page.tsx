"use client";

import {
  completeDataUpload,
  pollDataTransformTask,
  requestUploadUrl,
  uploadFileToPresignedUrl,
} from "@/app/api/upload";
import { isAcceptedArchive, validateZipContents } from "@/lib/upload/validate";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  FileText,
  Gem,
  Loader2,
  MapPin,
  UploadCloud,
} from "lucide-react";

import { BuildingAccessSidebar } from "@/components/facility/building-access-sidebar";
import { FacilityShell } from "@/components/facility/facility-shell";
import { useFacilityBuildings } from "@/hooks/use-facility-buildings";
import { useRequireJob } from "@/hooks/use-require-job";

type UploadStatus =
  | "idle"
  | "requestingUploadUrl"
  | "uploadingFile"
  | "completingUpload"
  | "polling"
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
    return "파일 업로드는 완료됐지만 서버의 데이터 변환 단계에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  if (status) {
    return `업로드 처리 중 서버 오류가 발생했습니다. 상태 코드: ${status}`;
  }

  return "업로드 중 오류가 발생했습니다.";
};

function UploadPageContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    loading,
    buildings,
    selectedBuildingId,
    setSelectedBuildingId,
    addBuilding,
  } = useFacilityBuildings();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [isEmergency, setIsEmergency] = useState(false);

  // 파일 유효성 검사 상태
  const [isValidating, setIsValidating] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [invalidFileList, setInvalidFileList] = useState<string[]>([]);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );

  const preventDefault = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * 파일 선택 공통 핸들러
   * 1) ZIP 여부 확인 → 2) ZIP 내부 동영상 전용 검사
   */
  const handleFileSelect = async (file: File) => {
    // 이전 상태 초기화
    setFileError(null);
    setInvalidFileList([]);
    setSelectedFile(null);

    // ① ZIP 파일인지 확인
    if (!isAcceptedArchive(file)) {
      setFileError("ZIP 압축 파일(.zip)만 업로드할 수 있습니다.");
      return;
    }

    // ② ZIP 내부 콘텐츠 검사
    setIsValidating(true);
    try {
      const result = await validateZipContents(file);
      if (!result.valid) {
        setFileError(result.reason);
        setInvalidFileList(result.invalidFiles ?? []);
        return;
      }
      // 검사 통과 → 파일 등록
      setSelectedFile(file);
      setUploadStatus("idle");
      setProgress(0);
      setIsEmergency(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    preventDefault(e);
    if (e.dataTransfer.files?.[0]) {
      void handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      void handleFileSelect(e.target.files[0]);
      // 같은 파일을 다시 선택할 수 있도록 value 초기화
      e.target.value = "";
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
    if (!selectedBuildingId) {
      alert("왼쪽 목록에서 업로드할 건물을 선택해주세요.");
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
      await completeDataUpload({
        accessToken: token,
        taskId: uploadConfig.task_id,
      });
      setProgress(80);

      setUploadStatus("polling");
      await pollDataTransformTask({
        accessToken: token,
        taskId: uploadConfig.task_id,
        onProgress: (task) => {
          setProgress(Math.max(80, Math.min(99, task.progress_percent)));
        },
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
    return <div className="p-20 text-center font-mono text-zinc-400">LOADING...</div>;
  }

  return (
    <FacilityShell eyebrow="Data Upload" title="스캔 업로드">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <BuildingAccessSidebar
            buildings={buildings}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
            onBuildingAdded={addBuilding}
            className="min-h-[520px]"
          />
        </div>

        <div
          className={`lg:col-span-8 rounded-[2rem] border border-white/60 bg-white/30 p-6 shadow-2xl transition-colors sm:p-8 ${
            isEmergency ? "ring-2 ring-red-500/30" : ""
          }`}
          style={{ backdropFilter: "blur(20px)" }}
          onDragOver={preventDefault}
          onDrop={preventDefault}
        >
          <div className="mb-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
              Upload Target
            </p>
            {selectedBuilding ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-900/10 bg-white/40 p-4 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-900/50" />
                <div>
                  <p className="font-bold text-zinc-900">{selectedBuilding.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedBuilding.address ?? "주소 정보 없음"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                왼쪽에서 건물을 선택하거나 + 로 새 건물을 추가하세요.
              </p>
            )}
          </div>

          <div
            className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-12 transition-all duration-500 ${
              fileError
                ? "border-red-400 bg-red-50/60"
                : selectedFile
                  ? "border-red-500 bg-red-50/50"
                  : "border-red-900/20 bg-white/5 hover:border-red-500"
            }`}
            onClick={() =>
              !inProgressStatuses.includes(uploadStatus) &&
              !isValidating &&
              fileInputRef.current?.click()
            }
            onDragOver={preventDefault}
            onDragEnter={preventDefault}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".zip"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <div
              className={`mb-6 transition-transform duration-500 ${
                fileError
                  ? ""
                  : selectedFile
                    ? "scale-110"
                    : "group-hover:scale-110"
              }`}
            >
              {isValidating ? (
                <Loader2 className="h-16 w-16 animate-spin text-red-400" strokeWidth={1} />
              ) : fileError ? (
                <AlertCircle className="h-16 w-16 text-red-400" strokeWidth={1} />
              ) : selectedFile ? (
                <FileText className="h-16 w-16 text-red-600" strokeWidth={1} />
              ) : (
                <UploadCloud className="h-16 w-16 text-red-950/40" strokeWidth={1} />
              )}
            </div>

            <p
              className={`text-center font-mono text-xs tracking-widest ${
                fileError
                  ? "font-bold text-red-500"
                  : selectedFile
                    ? "font-bold text-red-900"
                    : "text-zinc-400"
              }`}
            >
              {isValidating
                ? "파일 검사 중…"
                : fileError
                  ? "다른 파일을 선택해주세요"
                  : selectedFile
                    ? selectedFile.name
                    : "ZIP 파일을 끌어오거나 클릭하여 선택"}
            </p>

            {!isValidating && !fileError && !selectedFile && (
              <p className="mt-2 font-mono text-[10px] text-zinc-400/70">
                동영상 파일(.mp4, .avi, .mov 등)만 포함된 .zip
              </p>
            )}
          </div>

          {/* 유효성 검사 오류 메시지 */}
          {fileError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-4">
              <p className="flex items-start gap-2 text-sm font-semibold text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {fileError}
              </p>
              {invalidFileList.length > 0 && (
                <ul className="mt-2 space-y-0.5 pl-6">
                  {invalidFileList.map((name) => (
                    <li key={name} className="font-mono text-[11px] text-red-500">
                      {name}
                    </li>
                  ))}
                  {invalidFileList.length === 5 && (
                    <li className="font-mono text-[11px] text-red-400">… 외 추가 파일</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="mt-10 flex min-h-[80px] flex-col items-center">
            {uploadStatus === "idle" && selectedFile && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedBuildingId}
                className="flex items-center gap-4 rounded-full bg-red-950 px-12 py-4 text-[10px] font-black uppercase tracking-[0.4em] text-white shadow-xl transition-all hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Upload
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {inProgressStatuses.includes(uploadStatus) && (
              <div className="w-full space-y-4">
                <div className="flex items-end justify-between">
                  <span className="animate-pulse font-mono text-[10px] uppercase tracking-widest text-red-600">
                    {uploadStatus === "requestingUploadUrl" && "업로드 URL 요청 중…"}
                    {uploadStatus === "uploadingFile" && "파일 업로드 중…"}
                    {uploadStatus === "completingUpload" && "변환 요청 중…"}
                  </span>
                  <span className="font-mono text-xs font-bold text-red-900">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-red-900/10">
                  <div
                    className="h-full bg-red-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadStatus === "success" && (
              <div className="flex flex-col items-center">
                <div className="mb-4 rounded-full bg-red-600 p-4">
                  <Gem className="h-6 w-6 text-white" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-900">
                  업로드 완료
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadStatus("idle");
                    setIsEmergency(false);
                    setProgress(0);
                  }}
                  className="mt-4 font-mono text-[9px] uppercase tracking-widest text-zinc-400 underline hover:text-red-600"
                >
                  다른 파일 선택
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </FacilityShell>
  );
}

export default function UploadPage() {
  const isReady = useRequireJob("FACILITY_MANAGER", "/emergency");

  if (!isReady) {
    return <div className="p-20 text-center font-mono text-zinc-400">LOADING...</div>;
  }

  return <UploadPageContent />;
}
