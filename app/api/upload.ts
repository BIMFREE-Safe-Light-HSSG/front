import axios from "axios";

import { apiUrl } from "@/lib/api/client";

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export type UploadStatus = "PENDING" | "COMPLETED" | "FAILED" | string;

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

export type CompleteUploadResponse = {
  message: string;
  task_id: string;
  status: UploadStatus;
  graph_data_id: string;
  graph_data: {
    nodes?: unknown[];
    edges?: unknown[];
    [key: string]: unknown;
  };
};

export const requestUploadUrl = async ({
  accessToken,
  file,
  buildingId,
}: {
  accessToken: string;
  file: File;
  buildingId: string;
}): Promise<UploadUrlResponse> => {
  const response = await axios.post(
    apiUrl("/data_transform/upload"),
    {
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      building_id: buildingId,
    },
    {
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
    }
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

export const completeUpload = async ({
  accessToken,
  taskId,
}: {
  accessToken: string;
  taskId: string;
}): Promise<CompleteUploadResponse> => {
  const response = await axios.post(
    apiUrl(`/data_transform/${taskId}/complete_upload`),
    null,
    {
      headers: authHeaders(accessToken),
    }
  );

  return response.data;
};
