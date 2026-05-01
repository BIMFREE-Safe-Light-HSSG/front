// api/auth.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const signin = async (email, password) => {
  // 1. POST 메서드 사용
  // 2. 주소는 /auth/login
  // 3. 데이터는 { email, password } 형태로 전송 (Axios가 자동으로 JSON 변환)
  console.log("전송 시작 주소:", `${API_URL}/auth/login`);
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: email,       // 이미지의 'email' 필드명과 일치해야 함
    password: password   // 이미지의 'password' 필드명과 일치해야 함
  });

  return response.data; // 성공 시 반환되는 '사용자 정보'
};
export const signup = async (email, password,name) => {
  console.log("전송 시작 주소:", `${API_URL}/auth/signup`);
  const response = await axios.post(`${API_URL}/auth/signup`, {
    email: email,       // 이미지의 'email' 필드명과 일치해야 함
    password: password,
    name:name// 이미지의 'password' 필드명과 일치해야 함
  });

  return response.data; // 성공 시 반환되는 '사용자 정보'
};