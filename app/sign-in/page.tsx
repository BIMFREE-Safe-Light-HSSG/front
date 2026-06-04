"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { signin } from "@/app/api/auth";
import { SignInForm } from "@/components/sign-in/sign-in-form";
import { SignUpShell } from "@/components/sign-up/sign-up-shell";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const result = await signin(email, password);

      if (result?.access_token) {
        localStorage.setItem("accessToken", result.access_token);
        if (result.user) {
          localStorage.setItem("currentUser", JSON.stringify(result.user));
        }
        window.dispatchEvent(new Event("auth-state-changed"));
      }

      router.push("/");
    } catch (error) {
      console.error("로그인 에러:", error);
      alert("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SignUpShell maxWidth="md">
      <SignInForm
        email={email}
        password={password}
        isLoading={isLoading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
      />
    </SignUpShell>
  );
}
