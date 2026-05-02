"use client";
import { upload } from "@/app/api/upload"; // 이 함수가 승인 데이터를 가져오는 핵심입니다.
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);

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

  // 🔥 수정된 핵심 업로드 로직
  const handleUpload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadStatus("uploading");
    setProgress(15);

    try {
      // 1. 임포트한 upload(selectedFile)를 호출하여 Pre-signed URL 설정을 받아옵니다.
      // (기존 fetch("/api/get-upload-url")을 대체함)
      const uploadConfig = await upload(selectedFile);

      /*
         가져온 uploadConfig 예시:
         { "upload_url": "...", "method": "PUT", "headers": { "Content-Type": "..." }, ... }
      */

      setProgress(40);

      // 2. 받아온 upload_url로 실제 파일을 바이너리 형태로 쏩니다.
      const uploadResponse = await fetch(uploadConfig.upload_url, {
        method: uploadConfig.method || "PUT",
        headers: {
          ...uploadConfig.headers, // 서버가 요구한 Content-Type 등을 그대로 사용
        },
        body: selectedFile, // 파일을 있는 그대로 전송
      });

      if (!uploadResponse.ok) throw new Error("Minio 전송 실패");

      // 3. 모든 과정 완료
      setProgress(100);
      setUploadStatus("success");

    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setProgress(0);
      alert("업로드 중 오류가 발생했습니다.");
    }
  };

  if (loading) return <div className="p-20 text-center">Loading...</div>;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50"
      onDragOver={preventDefault}
      onDrop={preventDefault}
    >
      <h1 className="text-3xl font-bold mb-10 text-gray-800">파일 업로드</h1>

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <div
          className={`relative border-2 border-dashed rounded-xl p-10 transition-all flex flex-col items-center
            ${selectedFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 cursor-pointer'}`}
          onClick={() => uploadStatus !== "uploading" && fileInputRef.current?.click()}
          onDragOver={preventDefault}
          onDragEnter={preventDefault}
          onDrop={handleDrop}
        >
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <div className="text-5xl mb-4">{selectedFile ? "📄" : "📁"}</div>
          <p className="text-gray-600 font-medium text-center">
            {selectedFile ? selectedFile.name : "드래그하거나 클릭하여 파일 선택"}
          </p>
        </div>

        <div className="mt-8">
          {uploadStatus === "idle" && selectedFile && (
            <button
              type="button"
              onClick={handleUpload}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
            >
              업로드 시작하기
            </button>
          )}

          {uploadStatus === "uploading" && (
            <div className="space-y-3 text-center">
              <div className="flex justify-between text-sm font-semibold text-blue-600">
                <span>서버 전송 중...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadStatus === "success" && (
            <div className="flex flex-col items-center text-center">
              <div className="w-full h-3 bg-green-500 rounded-full mb-3"></div>
              <p className="text-green-600 font-bold text-lg">✅ 업로드 완료</p>
              <button
                type="button"
                onClick={() => {setSelectedFile(null); setUploadStatus("idle");}}
                className="mt-4 text-gray-400 hover:text-gray-600 underline text-xs"
              >
                다른 파일 선택
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}