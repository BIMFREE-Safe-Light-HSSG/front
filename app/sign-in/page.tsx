"use client"; // 1. 클라이언트 컴포넌트 선언 (이벤트 처리를 위해 필수)

import { useState } from "react"; // 2. 상태 관리를 위한 import
import { useRouter } from "next/navigation"; // 로그인 성공 후 이동을 위한 import
import { signin } from "@/app/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  // 3. 입력값을 저장할 상태 변수 설정
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 4. 폼 제출 핸들러 작성
 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); // 페이지 새로고침 방지
  setIsLoading(true);

  try {

    const result = await signin(email, password);

    if (result && result.access_token) {
      localStorage.setItem("accessToken", result.access_token);
      console.log("토큰 저장 완료:", result.access_token);
    } else {
      console.warn("로그인은 성공했으나 토큰이 응답에 없습니다.");
    }
    window.location.href = "/";

  } catch (error) {
    console.error("로그인 에러 상세:", error);
    alert("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <a href="/" className="inline-flex items-center gap-2 mb-8 group">
            <span className="font-display text-xl tracking-tight">Demo</span>
            <span className="text-muted-foreground font-mono text-[10px] mt-0.5">TM</span>
          </a>
          <h1 className="text-2xl font-display tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
        </div>

        {/* 5. form에 onSubmit 연결 */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              // 6. value와 onChange 연결
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              // 7. value와 onChange 연결
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {/* 8. 로딩 상태에 따른 버튼 비활성화 처리 */}
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-11"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}