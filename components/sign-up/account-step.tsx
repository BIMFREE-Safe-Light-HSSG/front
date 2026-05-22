"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Wrench } from "lucide-react";

import type { UserJob } from "@/app/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AccountStepProps = {
  name: string;
  email: string;
  password: string;
  job: UserJob;
  isLoading: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onJobChange: (job: UserJob) => void;
  onSubmit: () => void;
};

export function AccountStep({
  name,
  email,
  password,
  job,
  isLoading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onJobChange,
  onSubmit,
}: AccountStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-red-800/50">
          Step 1 · 계정
        </p>
        <h1 className="font-display text-3xl tracking-tight text-zinc-900">회원가입</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onJobChange("FACILITY_MANAGER")}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            job === "FACILITY_MANAGER"
              ? "border-red-600/40 bg-red-50/80 shadow-sm shadow-red-500/10"
              : "border-zinc-200/80 bg-white/50 hover:border-red-200",
          )}
        >
          <Wrench
            className={cn(
              "mb-3 h-5 w-5",
              job === "FACILITY_MANAGER" ? "text-red-700" : "text-zinc-400",
            )}
          />
          <p className="text-sm font-bold text-zinc-900">시설관리자</p>
          <p className="mt-1 text-xs text-zinc-500">건물 등록 · 스캔 업로드 · 3D 조회</p>
        </button>
        <button
          type="button"
          onClick={() => onJobChange("FIREFIGHTER")}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            job === "FIREFIGHTER"
              ? "border-red-600/40 bg-red-50/80 shadow-sm shadow-red-500/10"
              : "border-zinc-200/80 bg-white/50 hover:border-red-200",
          )}
        >
          <ShieldCheck
            className={cn(
              "mb-3 h-5 w-5",
              job === "FIREFIGHTER" ? "text-red-700" : "text-zinc-400",
            )}
          />
          <p className="text-sm font-bold text-zinc-900">소방대원</p>
          <p className="mt-1 text-xs text-zinc-500">관할 지구 건물 · 화재 알림</p>
        </button>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            type="text"
            placeholder="홍길동"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-11 rounded-xl border-red-900/10 bg-white/70"
          />
        </div>

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
            placeholder="8자 이상"
            autoComplete="new-password"
            required
            minLength={6}
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
          {isLoading ? "잠시만요…" : "회원가입"}
          {!isLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-red-800 underline underline-offset-4 hover:text-red-600"
        >
          로그인
        </Link>
      </p>
    </div>
  );
}
