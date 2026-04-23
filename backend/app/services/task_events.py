"""Task event hub with websocket broadcast and JSONL persistence."""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import WebSocket

MAX_BUFFERED_EVENTS = 400


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TaskEventManager:
    """Broadcast task lifecycle/output events and keep recent task history."""

    def __init__(self, events_dir: Path) -> None:
        self.events_dir = events_dir
        self.events_dir.mkdir(parents=True, exist_ok=True)
        self._connections: list[WebSocket] = []
        self._history: dict[str, deque[dict[str, Any]]] = defaultdict(
            lambda: deque(maxlen=MAX_BUFFERED_EVENTS)
        )
        self._lock = asyncio.Lock()

    def _path_for_task(self, task_id: str) -> Path:
        return self.events_dir / f"{task_id}.jsonl"

    def _store(self, task_id: str, message: dict[str, Any]) -> None:
        self._history[task_id].append(message)
        with self._path_for_task(task_id).open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(message, ensure_ascii=False) + "\n")

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.append(ws)
        await ws.send_text(json.dumps({"event": "connected", "timestamp": _utc_now_iso()}, ensure_ascii=False))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            if ws in self._connections:
                self._connections.remove(ws)

    async def broadcast(self, message: dict[str, Any]) -> None:
        payload = json.dumps(message, ensure_ascii=False)
        async with self._lock:
            recipients = list(self._connections)
        dead: list[WebSocket] = []
        for ws in recipients:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    def get_recent_events(self, task_id: str, limit: int = 200) -> list[dict[str, Any]]:
        if task_id not in self._history:
            path = self._path_for_task(task_id)
            if path.exists():
                lines = path.read_text(encoding="utf-8").splitlines()
                for line in lines[-MAX_BUFFERED_EVENTS:]:
                    try:
                        self._history[task_id].append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        events = list(self._history.get(task_id, ()))
        if limit <= 0:
            return events
        return events[-limit:]

    async def publish_task_event(self, task: dict[str, Any], event: str = "task.updated", **extra: Any) -> None:
        payload = {
            "event": event,
            "task_id": task["id"],
            "timestamp": _utc_now_iso(),
            "task": task,
        }
        if extra:
            payload.update(extra)
        self._store(task["id"], payload)
        await self.broadcast(payload)

    async def publish_output(self, task_id: str, stream: str, message: str) -> None:
        payload = {
            "event": "task.output",
            "task_id": task_id,
            "stream": stream,
            "message": message,
            "timestamp": _utc_now_iso(),
        }
        self._store(task_id, payload)
        await self.broadcast(payload)

