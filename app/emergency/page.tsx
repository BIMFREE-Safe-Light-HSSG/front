"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceView from "@/components/workspace-view";
import type { AuthUser } from "@/app/api/auth";

export default function EmergencyPage() {
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

      if (user.job !== "FIREFIGHTER") {
        router.replace("/facility");
        return;
      }

      setIsReady(true);
    } catch {
      router.replace("/sign-in");
    }
  }, [router]);

  if (!isReady) {
    return <div className="p-20 text-center font-mono text-zinc-400">LOADING WORKSPACE...</div>;
  }

  return <WorkspaceView />;
}
