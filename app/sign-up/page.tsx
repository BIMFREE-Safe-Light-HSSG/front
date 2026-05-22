"use client";

import { useState } from "react";

import type { UserJob } from "@/app/api/auth";
import { AccountStep } from "@/components/sign-up/account-step";
import { OnboardingFlow } from "@/components/sign-up/onboarding-flow";
import { SignUpShell } from "@/components/sign-up/sign-up-shell";

type Phase = "account" | "onboarding";

export type AccountFormData = {
  name: string;
  email: string;
  password: string;
  job: UserJob;
};

export default function SignUpPage() {
  const [phase, setPhase] = useState<Phase>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [job, setJob] = useState<UserJob>("FACILITY_MANAGER");
  const handleAccountContinue = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert("이름, 이메일, 비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      alert("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setPhase("onboarding");
  };

  return (
    <SignUpShell maxWidth={phase === "onboarding" ? "lg" : "md"}>
      {phase === "account" ? (
        <AccountStep
          name={name}
          email={email}
          password={password}
          job={job}
          isLoading={false}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onJobChange={setJob}
          onSubmit={handleAccountContinue}
        />
      ) : (
        <OnboardingFlow
          name={name.trim()}
          email={email.trim()}
          password={password}
          job={job}
          onBackToAccount={() => setPhase("account")}
        />
      )}
    </SignUpShell>
  );
}
