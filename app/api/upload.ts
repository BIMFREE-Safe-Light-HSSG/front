// api/upload.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const upload = async (file: File) => {
  // 1. 로컬 스토리지에서 토큰 가져오기
  const token = localStorage.getItem("accessToken");

  // 2. 서버에 업로드 승인 요청
  const response = await axios.post(
    `${API_URL}/data_transform/upload`,
    {
      // UI에서 넘겨받은 실제 파일 정보를 사용합니다.
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      building_id: null // 필요 시 나중에 인자로 받아 처리
    },
    {
      // ✅ 3. 핵심: 헤더에 토큰 추가
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data; // 성공 시 반환되는 업로드 설정 정보 (upload_url 등)
};