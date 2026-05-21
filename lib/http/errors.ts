import axios from "axios";

export function getAxiosErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  return undefined;
}

export function clearAuthSession(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentUser");
  window.dispatchEvent(new Event("auth-state-changed"));
}

/** 401이면 세션 정리·알림 후 true */
export function handleUnauthorized(error: unknown, onRedirect: () => void): boolean {
  if (getAxiosErrorStatus(error) !== 401) {
    return false;
  }

  clearAuthSession();
  alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
  onRedirect();
  return true;
}
