"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthUser, UserJob } from "@/app/api/auth";

export function useRequireJob(requiredJob: UserJob, wrongJobRedirect: string): boolean {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userJson = localStorage.getItem("currentUser");

    if (!token || !userJson) {
      router.replace("/sign-in");
      return;
    }

    try {
      const user = JSON.parse(userJson) as AuthUser;

      if (user.job !== requiredJob) {
        router.replace(wrongJobRedirect);
        return;
      }

      setIsReady(true);
    } catch {
      router.replace("/sign-in");
    }
  }, [requiredJob, router, wrongJobRedirect]);

  return isReady;
}
