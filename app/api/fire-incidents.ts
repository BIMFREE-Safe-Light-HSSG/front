import axios from "axios";

import type { UserJob } from "@/app/api/auth";
import { apiUrl } from "@/lib/api/client";
import type { FireIncident, FireSeverity } from "@/lib/fire-incidents/types";
import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

const workspacePrefix = (job: UserJob | null | undefined) =>
  job === "FIREFIGHTER" ? "/emergency" : "/facility";

export type ApiFireIncident = {
  id: string;
  building_id: string;
  position: number[];
  severity: FireSeverity;
  note: string | null;
  zone_id: string | null;
  zone_name: string | null;
  status: string;
  reported_at: string;
  reported_by: string | null;
};

export type FireNotification = {
  id: string;
  fire_incident_id: string;
  building_id: string;
  building_name: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function mapApiFireIncident(raw: ApiFireIncident): FireIncident {
  return {
    id: String(raw.id),
    position: [raw.position[0], raw.position[1], raw.position[2]] as Vec3,
    severity: raw.severity,
    reported_at: raw.reported_at,
    ...(raw.note ? { note: raw.note } : {}),
    ...(raw.reported_by ? { reported_by: raw.reported_by } : {}),
    ...(raw.zone_id ? { zone_id: raw.zone_id } : {}),
    ...(raw.zone_name ? { zone_name: raw.zone_name } : {}),
  };
}

export const listBuildingFireIncidents = async (
  accessToken: string,
  buildingId: string,
  job: UserJob | null | undefined,
): Promise<FireIncident[]> => {
  const response = await axios.get<ApiFireIncident[]>(
    apiUrl(`${workspacePrefix(job)}/buildings/${buildingId}/fire-incidents`),
    { headers: authHeaders(accessToken) },
  );

  return response.data.map(mapApiFireIncident);
};

export type CreateFireIncidentPayload = {
  position: Vec3;
  severity?: FireSeverity;
  note?: string;
  zone_id?: string;
  zone_name?: string;
};

export const createBuildingFireIncident = async (
  accessToken: string,
  buildingId: string,
  payload: CreateFireIncidentPayload,
): Promise<FireIncident> => {
  const response = await axios.post<ApiFireIncident>(
    apiUrl(`/facility/buildings/${buildingId}/fire-incidents`),
    {
      position: payload.position,
      severity: payload.severity ?? "high",
      note: payload.note ?? null,
      zone_id: payload.zone_id ?? null,
      zone_name: payload.zone_name ?? null,
    },
    {
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
    },
  );

  return mapApiFireIncident(response.data);
};

export const deleteBuildingFireIncident = async (
  accessToken: string,
  buildingId: string,
  incidentId: string,
): Promise<void> => {
  await axios.delete(
    apiUrl(`/facility/buildings/${buildingId}/fire-incidents/${incidentId}`),
    { headers: authHeaders(accessToken) },
  );
};

export const listFireNotifications = async (
  accessToken: string,
  unreadOnly = false,
): Promise<FireNotification[]> => {
  const response = await axios.get<FireNotification[]>(
    apiUrl("/emergency/notifications"),
    {
      headers: authHeaders(accessToken),
      params: unreadOnly ? { unread_only: true } : undefined,
    },
  );

  return response.data;
};

export const getFireNotificationUnreadCount = async (
  accessToken: string,
): Promise<number> => {
  const response = await axios.get<{ unread_count: number }>(
    apiUrl("/emergency/notifications/unread-count"),
    { headers: authHeaders(accessToken) },
  );

  return response.data.unread_count;
};

export const markFireNotificationRead = async (
  accessToken: string,
  notificationId: string,
): Promise<void> => {
  await axios.patch(
    apiUrl(`/emergency/notifications/${notificationId}/read`),
    null,
    { headers: authHeaders(accessToken) },
  );
};
