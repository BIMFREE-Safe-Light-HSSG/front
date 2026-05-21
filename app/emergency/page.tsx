"use client";

import EmergencyWorkspaceView from "@/components/emergency-workspace-view";
import { useRequireJob } from "@/hooks/use-require-job";

export default function EmergencyPage() {
  const isReady = useRequireJob("FIREFIGHTER", "/facility");

  if (!isReady) {
    return <div className="p-20 text-center font-mono text-zinc-400">LOADING WORKSPACE...</div>;
  }

  return <EmergencyWorkspaceView />;
}
