"use client";

import WorkspaceView from "@/components/workspace-view";
import { useRequireJob } from "@/hooks/use-require-job";

export default function FacilityPage() {
  const isReady = useRequireJob("FACILITY_MANAGER", "/emergency");

  if (!isReady) {
    return <div className="p-20 text-center font-mono text-zinc-400">LOADING WORKSPACE...</div>;
  }

  return <WorkspaceView />;
}
