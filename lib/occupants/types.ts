import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

export type OccupantRole = "rescuer" | "victim" | "other";

export type Occupant = {
  id: string;
  position: Vec3;
  zone_id?: string;
  zone_name?: string;
  label?: string;
  role?: OccupantRole;
};
