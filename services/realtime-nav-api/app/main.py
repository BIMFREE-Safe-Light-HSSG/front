"""RunPod / local CPU service for realtime fire navigation."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.engine import NavEngine

GRAPH_PATH = Path(os.getenv("NAV_GRAPH_PATH", "/app/data/nav_graph.json"))
API_KEY = os.getenv("REALTIME_NAV_API_KEY", "").strip()
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

app = FastAPI(title="SuperSafeTwin Realtime Nav", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = NavEngine(GRAPH_PATH)


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not API_KEY:
        return
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="invalid_api_key")


class SessionStartBody(BaseModel):
    fire_node: str | None = None
    rescuer_node: str | None = None
    victim_node: str | None = None
    reset_clock: bool = True


class NodeUpdateBody(BaseModel):
    node_id: str = Field(min_length=1)


class FireUpdateBody(BaseModel):
    fire_node: str = Field(min_length=1)
    reset_clock: bool = True


@app.get("/health")
def health() -> dict[str, str | int]:
    return {
        "status": "ok",
        "graph": str(GRAPH_PATH),
        "node_count": len(engine.nodes),
    }


@app.get("/nodes")
def list_nodes(type: str | None = None, _: None = Depends(require_api_key)) -> dict[str, object]:
    return {"nodes": engine.list_nodes(type)}


@app.post("/session")
def start_session(body: SessionStartBody, _: None = Depends(require_api_key)) -> dict[str, object]:
    try:
        return engine.start_session(
            fire_node=body.fire_node,
            rescuer_node=body.rescuer_node,
            victim_node=body.victim_node,
            reset_clock=body.reset_clock,
        )
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=f"unknown_node: {exc}") from exc


@app.get("/state")
def get_state(_: None = Depends(require_api_key)) -> dict[str, object]:
    try:
        return engine.get_state()
    except RuntimeError as exc:
        if str(exc) == "session_not_started":
            raise HTTPException(status_code=409, detail="session_not_started") from exc
        raise


@app.patch("/session/rescuer")
def update_rescuer(body: NodeUpdateBody, _: None = Depends(require_api_key)) -> dict[str, object]:
    if body.node_id not in engine.nodes:
        raise HTTPException(status_code=400, detail=f"unknown_node: {body.node_id}")
    try:
        return engine.update_rescuer(body.node_id)
    except RuntimeError as exc:
        if str(exc) == "session_not_started":
            raise HTTPException(status_code=409, detail="session_not_started") from exc
        raise


@app.patch("/session/victim")
def update_victim(body: NodeUpdateBody, _: None = Depends(require_api_key)) -> dict[str, object]:
    if body.node_id not in engine.nodes:
        raise HTTPException(status_code=400, detail=f"unknown_node: {body.node_id}")
    try:
        return engine.update_victim(body.node_id)
    except RuntimeError as exc:
        if str(exc) == "session_not_started":
            raise HTTPException(status_code=409, detail="session_not_started") from exc
        raise


@app.patch("/session/fire")
def update_fire(body: FireUpdateBody, _: None = Depends(require_api_key)) -> dict[str, object]:
    if body.fire_node not in engine.nodes:
        raise HTTPException(status_code=400, detail=f"unknown_node: {body.fire_node}")
    try:
        return engine.update_fire(body.fire_node, reset_clock=body.reset_clock)
    except RuntimeError as exc:
        if str(exc) == "session_not_started":
            raise HTTPException(status_code=409, detail="session_not_started") from exc
        raise
