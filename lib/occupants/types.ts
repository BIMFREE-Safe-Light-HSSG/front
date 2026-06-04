import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

export type Occupant = {
  id: string;
  position: Vec3;
  zone_id?: string;
  zone_name?: string;
  label?: string;
};
