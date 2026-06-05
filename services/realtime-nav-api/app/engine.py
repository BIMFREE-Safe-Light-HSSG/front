"""Fire spread + dynamic A* path planning for RunPod nav API."""

from __future__ import annotations

import heapq
import json
import math
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

SPREAD_INTERVAL = 40.0
SPREAD_DIST_PER_WAVE = 10.0


def _level_passable(level: int) -> bool:
    return level >= 2


def _level_cost(level: int) -> float:
    if level <= 1:
        return 1e9
    if level == 2:
        return 5.0
    if level == 3:
        return 2.0
    return max(1.0, 6.0 - level * 0.5)


def load_graph(graph_path: Path) -> tuple[dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    data = json.loads(graph_path.read_text(encoding="utf-8"))
    nodes = {node["id"]: node for node in data["nodes"]}
    edges = data["edges"]
    return nodes, edges


class FireSimulator:
    def __init__(self, nodes: dict[str, dict[str, Any]], edges: dict[str, list[dict[str, Any]]], fire_node: str):
        self.nodes = nodes
        self.edges = edges
        self.fire_node = fire_node
        self.start_t = time.time()
        self.state: dict[str, int] = {}
        self._dist = self._dijkstra()

    def reset_clock(self) -> None:
        self.start_t = time.time()
        self.state = {}

    def _dijkstra(self) -> dict[str, float]:
        dist: dict[str, float] = {self.fire_node: 0.0}
        heap: list[tuple[float, str]] = [(0.0, self.fire_node)]

        while heap:
            current_dist, node_id = heapq.heappop(heap)
            if current_dist > dist.get(node_id, float("inf")):
                continue
            for edge in self.edges.get(node_id, []):
                neighbor = edge["to"]
                next_dist = current_dist + edge["dist"]
                if next_dist < dist.get(neighbor, float("inf")):
                    dist[neighbor] = next_dist
                    heapq.heappush(heap, (next_dist, neighbor))

        return dist

    def tick(self) -> dict[str, int]:
        elapsed = time.time() - self.start_t
        max_dist = elapsed * (SPREAD_DIST_PER_WAVE / SPREAD_INTERVAL)

        state: dict[str, int] = {}
        for node_id, distance in self._dist.items():
            if distance <= max_dist:
                state[node_id] = int(distance / SPREAD_DIST_PER_WAVE)

        self.state = state
        return state

    def snapshot(self) -> dict[str, Any]:
        self.tick()
        return {
            "timestamp": time.time(),
            "elapsed_sec": round(time.time() - self.start_t, 1),
            "fire_node": self.fire_node,
            "fire_nodes": self.state,
            "blocked_nodes": [node_id for node_id, level in self.state.items() if not _level_passable(level)],
        }


class DynamicPathPlanner:
    def __init__(self, nodes: dict[str, dict[str, Any]], edges: dict[str, list[dict[str, Any]]]):
        self.nodes = nodes
        self.edges = edges
        self.path: list[str] = []
        self.cost = 0.0
        self.safe = True
        self.reason = "init"

    def plan(self, src: str, dst: str, fire_state: dict[str, int]) -> list[str]:
        if src not in self.nodes:
            self.path = []
            self.safe = False
            self.reason = f"출발 노드 '{src}' 가 그래프에 없음"
            return []

        if dst not in self.nodes:
            self.path = []
            self.safe = False
            self.reason = f"목적 노드 '{dst}' 가 그래프에 없음"
            return []

        if src not in self.edges or not self.edges[src]:
            self.path = []
            self.safe = False
            self.reason = f"출발 노드 '{src}' 에 연결된 엣지가 없음 (고립 노드)"
            return []

        if dst not in self.edges or not self.edges[dst]:
            self.path = []
            self.safe = False
            self.reason = f"목적 노드 '{dst}' 에 연결된 엣지가 없음 (고립 노드)"
            return []

        heap: list[tuple[float, int, str, list[str]]] = [(0.0, 0, src, [src])]
        visited: dict[str, float] = {}
        counter = 0
        blocked_by_fire = 0

        def heuristic(a: str, b: str) -> float:
            center_a = self.nodes.get(a, {}).get("center", [0, 0, 0])
            center_b = self.nodes.get(b, {}).get("center", [0, 0, 0])
            return math.dist(center_a[:2], center_b[:2])

        def edge_weight(neighbor: str, base_dist: float) -> float:
            level = fire_state.get(neighbor, "safe")
            multiplier = _level_cost(level) if isinstance(level, int) else 1.0
            node_type = self.nodes.get(neighbor, {}).get("type", "room")
            bonus = 0.8 if node_type in ("waypoint", "corridor") else (1.4 if node_type == "room" else 1.0)
            return base_dist * multiplier * bonus

        while heap:
            cost, _, current, path = heapq.heappop(heap)
            if current in visited:
                continue
            visited[current] = cost

            if current == dst:
                self.path = path
                self.cost = cost
                self.safe = all(fire_state.get(node_id, "safe") not in (0, 1) for node_id in path)
                self.reason = "ok"
                return path

            for edge in self.edges.get(current, []):
                neighbor = edge["to"]
                if neighbor in visited:
                    continue

                level = fire_state.get(neighbor, "safe")
                if isinstance(level, int) and not _level_passable(level):
                    blocked_by_fire += 1
                    continue

                next_cost = cost + edge_weight(neighbor, edge["dist"])
                counter += 1
                heapq.heappush(
                    heap,
                    (next_cost + heuristic(neighbor, dst), counter, neighbor, path + [neighbor]),
                )

        if blocked_by_fire > 0:
            self.reason = f"화재로 인해 모든 경로가 차단됨 (차단된 엣지: {blocked_by_fire}개)"
        else:
            self.reason = f"'{src}' → '{dst}' 경로 없음 (서로 다른 컴포넌트이거나 엣지 미연결)"

        self.path = []
        self.safe = False
        return []

    def tick(self, src: str, dst: str, fire_state: dict[str, int]) -> dict[str, Any]:
        path = self.plan(src, dst, fire_state)
        coords = [self.nodes[node_id]["center"] for node_id in path if node_id in self.nodes]

        return {
            "timestamp": time.time(),
            "path": path,
            "path_coords": [coord[:3] for coord in coords],
            "total_cost": round(self.cost, 2),
            "is_safe": self.safe,
            "warning": None if self.safe else "경고: 완전 안전한 경로 없음",
            "replan_reason": self.reason,
        }


@dataclass
class NavSession:
    fire_node: str
    rescuer_node: str
    victim_node: str
    fire_sim: FireSimulator
    planner: DynamicPathPlanner
    created_at: float = field(default_factory=time.time)

    def set_rescuer(self, node_id: str) -> None:
        self.rescuer_node = node_id

    def set_victim(self, node_id: str) -> None:
        self.victim_node = node_id

    def set_fire(self, node_id: str) -> None:
        self.fire_node = node_id
        self.fire_sim = FireSimulator(self.fire_sim.nodes, self.fire_sim.edges, node_id)

    def reset_clock(self) -> None:
        self.fire_sim.reset_clock()

    def state(self) -> dict[str, Any]:
        fire = self.fire_sim.snapshot()
        path = self.planner.tick(self.rescuer_node, self.victim_node, fire["fire_nodes"])

        return {
            "session": {
                "fire_node": self.fire_node,
                "rescuer_node": self.rescuer_node,
                "victim_node": self.victim_node,
                "created_at": self.created_at,
            },
            "fire": fire,
            "path": path,
        }


class NavEngine:
    def __init__(self, graph_path: Path):
        self.graph_path = graph_path
        self.nodes, self.edges = load_graph(graph_path)
        self.session: NavSession | None = None

    def list_nodes(self, node_type: str | None = None) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for node_id, node in self.nodes.items():
            if node_type and node.get("type") != node_type:
                continue
            items.append(
                {
                    "id": node_id,
                    "type": node.get("type"),
                    "floor": node.get("floor"),
                    "center": node.get("center"),
                }
            )
        items.sort(key=lambda item: item["id"])
        return items

    def default_room_ids(self) -> tuple[str, str, str]:
        rooms = [node_id for node_id, node in self.nodes.items() if node.get("type") in ("room", "corridor")]
        if len(rooms) >= 3:
            return rooms[0], rooms[-1], rooms[len(rooms) // 2]
        if len(rooms) == 2:
            return rooms[0], rooms[1], rooms[0]
        if len(rooms) == 1:
            return rooms[0], rooms[0], rooms[0]
        keys = list(self.nodes.keys())
        return keys[0], keys[-1], keys[len(keys) // 2]

    def start_session(
        self,
        *,
        fire_node: str | None = None,
        rescuer_node: str | None = None,
        victim_node: str | None = None,
        reset_clock: bool = True,
    ) -> dict[str, Any]:
        default_fire, default_rescuer, default_victim = self.default_room_ids()
        fire = fire_node or default_fire
        rescuer = rescuer_node or default_rescuer
        victim = victim_node or default_victim

        fire_sim = FireSimulator(self.nodes, self.edges, fire)
        planner = DynamicPathPlanner(self.nodes, self.edges)
        self.session = NavSession(
            fire_node=fire,
            rescuer_node=rescuer,
            victim_node=victim,
            fire_sim=fire_sim,
            planner=planner,
        )
        if not reset_clock:
            self.session.fire_sim.start_t = time.time()

        return self.session.state()

    def require_session(self) -> NavSession:
        if self.session is None:
            raise RuntimeError("session_not_started")
        return self.session

    def get_state(self) -> dict[str, Any]:
        return self.require_session().state()

    def update_rescuer(self, node_id: str) -> dict[str, Any]:
        session = self.require_session()
        session.set_rescuer(node_id)
        return session.state()

    def update_victim(self, node_id: str) -> dict[str, Any]:
        session = self.require_session()
        session.set_victim(node_id)
        return session.state()

    def update_fire(self, node_id: str, *, reset_clock: bool = True) -> dict[str, Any]:
        session = self.require_session()
        session.set_fire(node_id)
        if reset_clock:
            session.reset_clock()
        return session.state()
