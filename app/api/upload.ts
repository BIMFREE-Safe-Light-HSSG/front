// api/upload.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const upload = async (file: File) => {
  // 1. 로컬 스토리지에서 토큰 가져오기
  const token = localStorage.getItem("accessToken");

  // 2. 서버에 업로드 승인 요청 (Presigned URL 발급)
  const response = await axios.post(
    `${API_URL}/data_transform/upload`,
    {
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      building_id: null
    },
    {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  const { upload_url } = response.data;


  await axios.put(upload_url, file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    }
  });

  return response.data; // 최종적으로 승인 정보 및 상태 반환
};