"use client"; // 1. 클라이언트 컴포넌트 선언

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/app/api/auth"; // signup 함수 임포트
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  // 2. 상태 관리 변수 설정 (이름, 이메일, 비밀번호)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 3. 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // API 전송: email, password, name 순서 확인
      const result = await signup(email, password, name);
      console.log("회원가입 성공:", result);
      
      alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      router.push("/sign-in"); // 가입 성공 후 로그인 페이지로 이동
    } catch (error: any) {
      console.error("회원가입 에러:", error);
      alert("회원가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <a href="/" className="inline-flex items-center gap-2 mb-8 group">
            <span className="font-display text-xl tracking-tight">Demo</span>
            <span className="text-muted-foreground font-mono text-[10px] mt-0.5">TM</span>
          </a>
          <h1 className="text-2xl font-display tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">Get started for free. No credit card required.</p>
        </div>

        {/* 4. form에 onSubmit 연결 */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              required
              // 5. value와 onChange 연결
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              // 5. value와 onChange 연결
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              // 5. value와 onChange 연결
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-11"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/sign-in" className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}