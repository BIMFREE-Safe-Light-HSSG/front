import JSZip from "jszip";

// ─── 허용 확장자 ────────────────────────────────────────────────────────────

/** 업로드 허용 압축 확장자 */
export const ACCEPTED_ARCHIVE_EXTENSIONS = [".zip"] as const;

/** ZIP 내부에서 허용하는 동영상 확장자 */
const VIDEO_EXTENSIONS = new Set([
  "mp4", "avi", "mov", "mkv", "wmv", "flv",
  "webm", "m4v", "3gp", "ts", "mts", "m2ts",
  "mpeg", "mpg", "rm", "rmvb", "vob", "divx",
]);

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type ZipValidationResult =
  | { valid: true; fileCount: number }
  | { valid: false; reason: string; invalidFiles?: string[] };

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

/** 파일명에서 확장자(소문자, 점 제외)를 반환 */
function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx !== -1 ? filename.slice(idx + 1).toLowerCase() : "";
}

/**
 * macOS가 zip에 자동으로 끼워 넣는 메타데이터 항목은 검사에서 제외한다.
 * 예: __MACOSX/, .DS_Store
 */
function isMetaEntry(filename: string): boolean {
  return (
    filename.startsWith("__MACOSX/") ||
    filename.split("/").some((part) => part.startsWith("."))
  );
}

/** 동영상 파일 확장자인지 확인 */
function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.has(getExtension(filename));
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 선택한 파일이 허용된 압축 형식인지 확인한다.
 * input[accept] 속성만으로는 드래그&드롭을 막을 수 없으므로 JS에서도 검사한다.
 */
export function isAcceptedArchive(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_ARCHIVE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * ZIP 내부 파일 목록을 검사하여 모두 동영상 파일인지 확인한다.
 *
 * - 디렉토리 항목은 무시한다.
 * - macOS 메타데이터(__MACOSX, .DS_Store)는 무시한다.
 * - 동영상이 아닌 파일이 1개라도 있으면 invalid 반환.
 * - 유효한 동영상 파일이 0개이면 invalid 반환.
 */
export async function validateZipContents(
  file: File,
): Promise<ZipValidationResult> {
  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return { valid: false, reason: "ZIP 파일을 읽을 수 없습니다. 파일이 손상됐거나 올바른 ZIP이 아닙니다." };
  }

  // 실제 콘텐츠 항목만 필터링 (디렉토리·메타 제외)
  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && !isMetaEntry(entry.name),
  );

  if (entries.length === 0) {
    return { valid: false, reason: "압축 파일 안에 파일이 없습니다." };
  }

  const invalidFiles = entries
    .filter((entry) => !isVideoFile(entry.name))
    .map((entry) => entry.name);

  if (invalidFiles.length > 0) {
    return {
      valid: false,
      reason: `압축 파일 안에 동영상 파일(.mp4, .avi, .mov 등)만 포함되어야 합니다.`,
      invalidFiles: invalidFiles.slice(0, 5), // 최대 5개만 표시
    };
  }

  return { valid: true, fileCount: entries.length };
}
