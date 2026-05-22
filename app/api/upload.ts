import axios from "axios";

import { apiUrl } from "@/lib/api/client";

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export type UploadStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;

export type UploadUrlResponse = {
  task_id: string;
  status: UploadStatus;
  bucket_name: string;
  object_key: string;
  scan_file_path: string;
  upload_url: string;
  method: "PUT";
  expires_in: number;
  headers: Record<string, string>;
};

export type DataTransformTaskResponse = {
  task_id: string;
  building_id: string;
  status: UploadStatus;
  progress_percent: number;
  error_message: string | null;
};

/** POST /data-transforms/upload */
export const requestUploadUrl = async ({
  accessToken,
  file,
  buildingId,
}: {
  accessToken: string;
  file: File;
  buildingId: string;
}): Promise<UploadUrlResponse> => {
  const response = await axios.post<UploadUrlResponse>(
    apiUrl("/data-transforms/upload"),
    {
      building_id: buildingId,
      filename: file.name,
      content_type: file.type || "application/octet-stream",
    },
    {
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

export const uploadFileToPresignedUrl = async ({
  uploadUrl,
  file,
  headers,
}: {
  uploadUrl: string;
  file: File;
  headers: Record<string, string>;
}) => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...headers,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("MinIO 파일 업로드에 실패했습니다.");
  }
};

/** POST /data-transforms/{task_id}/complete-upload — 202 Accepted */
export const completeDataUpload = async ({
  accessToken,
  taskId,
}: {
  accessToken: string;
  taskId: string;
}): Promise<DataTransformTaskResponse> => {
  const response = await axios.post<DataTransformTaskResponse>(
    apiUrl(`/data-transforms/${taskId}/complete-upload`),
    null,
    {
      headers: authHeaders(accessToken),
      validateStatus: (status) => status === 202 || status === 200,
    },
  );

  return response.data;
};

/** GET /data-transforms/{task_id} */
export const getDataTransformTask = async ({
  accessToken,
  taskId,
}: {
  accessToken: string;
  taskId: string;
}): Promise<DataTransformTaskResponse> => {
  const response = await axios.get<DataTransformTaskResponse>(
    apiUrl(`/data-transforms/${taskId}`),
    {
      headers: authHeaders(accessToken),
    },
  );

  return response.data;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** FRONT.md — complete-upload 후 task polling */
export async function pollDataTransformTask({
  accessToken,
  taskId,
  onProgress,
  intervalMs = 2000,
  maxAttempts = 120,
}: {
  accessToken: string;
  taskId: string;
  onProgress?: (task: DataTransformTaskResponse) => void;
  intervalMs?: number;
  maxAttempts?: number;
}): Promise<DataTransformTaskResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const task = await getDataTransformTask({ accessToken, taskId });
    onProgress?.(task);

    if (task.status === "COMPLETED") {
      return task;
    }

    if (task.status === "FAILED") {
      throw new Error(task.error_message ?? "데이터 변환에 실패했습니다.");
    }

    await sleep(intervalMs);
  }

  throw new Error("데이터 변환 시간이 초과되었습니다.");
}
