import type { Vec3 } from "@/lib/scene-graph-skeleton/types";

function getRealtimeNavUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_REALTIME_NAV_URL?.replace(/\/$/, "");
}

function getRealtimeNavApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_REALTIME_NAV_API_KEY?.trim();
}

export type NavNodeSummary = {
  id: string;
  type?: string;
  floor?: string;
  center?: Vec3;
};

export type RealtimeNavPath = {
  path: string[];
  path_coords: Vec3[];
  total_cost: number;
  is_safe: boolean;
  warning: string | null;
  replan_reason: string;
};

export type RealtimeNavState = {
  session: {
    fire_node: string;
    rescuer_node: string;
    victim_node: string;
    created_at?: number;
  };
  fire: {
    elapsed_sec: number;
    fire_node: string;
    fire_nodes: Record<string, number>;
    blocked_nodes: string[];
  };
  path: RealtimeNavPath;
};

export function isRealtimeNavConfigured(): boolean {
  return Boolean(getRealtimeNavUrl());
}

export class RealtimeNavError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RealtimeNavError";
    this.status = status;
  }
}

export function isRealtimeNavSessionNotStarted(error: unknown): boolean {
  return error instanceof RealtimeNavError && error.status === 409;
}

function navHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = getRealtimeNavApiKey();
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  return headers;
}

async function navFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getRealtimeNavUrl();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_REALTIME_NAV_URL is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...navHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new RealtimeNavError(response.status, detail || response.statusText);
  }

  return response.json() as Promise<T>;
}

export async function fetchRealtimeNavHealth(): Promise<{ status: string; node_count: number }> {
  const baseUrl = getRealtimeNavUrl();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_REALTIME_NAV_URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`realtime-nav health ${response.status}`);
  }
  return response.json();
}

export async function fetchNavNodes(type?: string): Promise<NavNodeSummary[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  const payload = await navFetch<{ nodes: NavNodeSummary[] }>(`/nodes${query}`);
  return payload.nodes;
}

export async function startRealtimeNavSession(input?: {
  fire_node?: string;
  rescuer_node?: string;
  victim_node?: string;
  reset_clock?: boolean;
  simulate_elapsed_sec?: number;
}): Promise<RealtimeNavState> {
  return navFetch<RealtimeNavState>("/session", {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
}

export async function fetchRealtimeNavState(options?: {
  elapsedSec?: number;
}): Promise<RealtimeNavState> {
  const query =
    options?.elapsedSec != null
      ? `?elapsed_sec=${encodeURIComponent(String(options.elapsedSec))}`
      : "";
  return navFetch<RealtimeNavState>(`/state${query}`);
}

export async function updateRealtimeNavRescuer(nodeId: string): Promise<RealtimeNavState> {
  return navFetch<RealtimeNavState>("/session/rescuer", {
    method: "PATCH",
    body: JSON.stringify({ node_id: nodeId }),
  });
}

export async function updateRealtimeNavVictim(nodeId: string): Promise<RealtimeNavState> {
  return navFetch<RealtimeNavState>("/session/victim", {
    method: "PATCH",
    body: JSON.stringify({ node_id: nodeId }),
  });
}

/** path_coords → RoutePathsMesh용 단일 경로 */
export function realtimeNavPathToRoutePath(state: RealtimeNavState, id = "realtime-nav") {
  const points = state.path.path_coords;
  if (points.length < 2) return null;

  return {
    id,
    points,
  };
}
