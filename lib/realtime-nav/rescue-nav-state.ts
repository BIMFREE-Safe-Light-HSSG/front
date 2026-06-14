import type { RealtimeNavState } from "@/lib/realtime-nav/api";
import { realtimeNavPathToRoutePath } from "@/lib/realtime-nav/api";
import type { RoutePath } from "@/lib/scene-graph-skeleton/route-assets";

export type RescueNavApplyResult = {
  route: RoutePath | null;
  statusMessage: string | null;
  errorMessage: string | null;
};

export function formatRescueNavStatus(state: RealtimeNavState): string {
  const spreadCount = Object.keys(state.fire.fire_nodes).length;
  const blocked = state.fire.blocked_nodes.length;
  const segments = state.path.path.length;

  if (segments < 2) {
    return `경과 ${state.fire.elapsed_sec}s · 화재 ${spreadCount}구역(차단 ${blocked}) · ${state.path.replan_reason}`;
  }

  const safety = state.path.is_safe ? "안전 경로" : state.path.warning ?? "주의 경로";
  return `구조 경로 ${segments}구간 · 경과 ${state.fire.elapsed_sec}s · 화재 ${spreadCount}구역(차단 ${blocked}) · ${safety}`;
}

export function applyRescueNavState(state: RealtimeNavState): RescueNavApplyResult {
  const route = realtimeNavPathToRoutePath(state);

  if (!route) {
    return {
      route: null,
      statusMessage: null,
      errorMessage: state.path.replan_reason || "안전한 구조 경로를 찾지 못했습니다.",
    };
  }

  return {
    route,
    statusMessage: formatRescueNavStatus(state),
    errorMessage: null,
  };
}

/** GET /state 폴링 간격(ms). env 미설정 시 3s */
export function rescueNavPollIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_REALTIME_NAV_POLL_MS;
  const parsed = raw ? Number(raw) : 3000;
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : 3000;
}

/**
 * 폴링마다 elapsed_sec를 이만큼 증가(시뮬레이션 가속).
 * 0이면 실시간 경과만 사용.
 */
export function rescueNavSimStepSec(): number {
  const raw = process.env.NEXT_PUBLIC_REALTIME_NAV_SIM_STEP_SEC;
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
