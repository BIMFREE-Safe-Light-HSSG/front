"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignInFormProps = {
  email: string;
  password: string;
  isLoading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function SignInForm({
  email,
  password,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: SignInFormProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-red-800/50">
          계정 접속
        </p>
        <h1 className="font-display text-3xl tracking-tight text-zinc-900">로그인</h1>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-11 rounded-xl border-red-900/10 bg-white/70"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="h-11 rounded-xl border-red-900/10 bg-white/70"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-full bg-red-950 text-white hover:bg-red-900"
        >
          {isLoading ? "잠시만요…" : "로그인"}
          {!isLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        계정이 없으신가요?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-red-800 underline underline-offset-4 hover:text-red-600"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}
