import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

export type FireSeverity = "low" | "medium" | "high";

export type FireIncident = {
  id: string;
  position: Vec3;
  severity: FireSeverity;
  note?: string;
  reported_at: string;
  reported_by?: string;
  zone_id?: string;
  zone_name?: string;
};
