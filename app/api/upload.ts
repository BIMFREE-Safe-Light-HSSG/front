// api/upload.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const upload = async (filename, content_type,building_id) => {
  const response = await axios.post(`${API_URL}/data_transform/upload`, {
    filename: "scan.zip",
    content_type: "application/zip",
    building_id: null
});

  return response.data; // 성공 시 반환되는 '사용자 정보'
};
