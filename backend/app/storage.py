"""File-backed JSON storage for users, sessions, settings, and tasks."""

from __future__ import annotations

import json
import secrets
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.config import Settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat()


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return default
    return json.loads(raw)


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


class FileStateStore:
    """Thread-safe JSON store suitable for local single-node usage."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = threading.RLock()
        self.settings.ensure_data_dirs()
        self._ensure_defaults()

    def _ensure_defaults(self) -> None:
        with self._lock:
            if not self.settings.users_path.exists():
                _write_json(self.settings.users_path, [])
            if not self.settings.sessions_path.exists():
                _write_json(self.settings.sessions_path, [])
            if not self.settings.tasks_path.exists():
                _write_json(self.settings.tasks_path, [])
            if not self.settings.settings_path.exists():
                _write_json(
                    self.settings.settings_path,
                    {
                        "workspace_roots": self.settings.WORKSPACE_ROOTS,
                        "artifact_dirs": self.settings.ARTIFACT_INCLUDE_DIRS,
                        "default_working_dir": str(self.settings.resolve_workspace_roots()[0])
                        if self.settings.resolve_workspace_roots()
                        else "",
                        "default_prompt_prefix": "",
                        "updated_at": None,
                        "updated_by": None,
                    },
                )

    def list_users(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(_read_json(self.settings.users_path, []))

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        for user in self.list_users():
            if user["id"] == user_id:
                return user
        return None

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        target = email.strip().lower()
        for user in self.list_users():
            if str(user["email"]).strip().lower() == target:
                return user
        return None

    def save_user(self, user: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            users = self.list_users()
            updated = False
            for index, current in enumerate(users):
                if current["id"] == user["id"]:
                    users[index] = user
                    updated = True
                    break
            if not updated:
                users.append(user)
            _write_json(self.settings.users_path, users)
        return user

    def list_sessions(self) -> list[dict[str, Any]]:
        with self._lock:
            sessions = list(_read_json(self.settings.sessions_path, []))
            now = utc_now()
            alive = [item for item in sessions if datetime.fromisoformat(item["expires_at"]) > now]
            if len(alive) != len(sessions):
                _write_json(self.settings.sessions_path, alive)
            return alive

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        for session in self.list_sessions():
            if session["id"] == session_id:
                return session
        return None

    def create_session(self, user_id: str) -> dict[str, Any]:
        now = utc_now()
        session = {
            "id": secrets.token_urlsafe(32),
            "user_id": user_id,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=self.settings.SESSION_DURATION_HOURS)).isoformat(),
        }
        with self._lock:
            sessions = self.list_sessions()
            sessions.append(session)
            _write_json(self.settings.sessions_path, sessions)
        return session

    def delete_session(self, session_id: str) -> None:
        with self._lock:
            sessions = [item for item in self.list_sessions() if item["id"] != session_id]
            _write_json(self.settings.sessions_path, sessions)

    def delete_sessions_for_user(self, user_id: str) -> None:
        with self._lock:
            sessions = [item for item in self.list_sessions() if item["user_id"] != user_id]
            _write_json(self.settings.sessions_path, sessions)

    def get_settings(self) -> dict[str, Any]:
        with self._lock:
            return dict(_read_json(self.settings.settings_path, {}))

    def save_settings(self, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            _write_json(self.settings.settings_path, payload)
        return payload

    def list_tasks(self) -> list[dict[str, Any]]:
        with self._lock:
            tasks = list(_read_json(self.settings.tasks_path, []))
        return sorted(tasks, key=lambda item: item.get("created_at") or "", reverse=True)

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        for task in self.list_tasks():
            if task["id"] == task_id:
                return task
        return None

    def save_task(self, task: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            tasks = self.list_tasks()
            updated = False
            for index, current in enumerate(tasks):
                if current["id"] == task["id"]:
                    tasks[index] = task
                    updated = True
                    break
            if not updated:
                tasks.append(task)
            _write_json(self.settings.tasks_path, tasks)
        return task

    def recent_tasks_by_status(self, status: str) -> list[dict[str, Any]]:
        return [task for task in self.list_tasks() if task.get("status") == status]

    def bootstrap_admin_password(self) -> str:
        return self.settings.BOOTSTRAP_ADMIN_PASSWORD or secrets.token_urlsafe(14)

    def write_bootstrap_credentials(self, email: str, password: str) -> None:
        self.settings.bootstrap_credentials_path.write_text(
            f"email={email}\npassword={password}\n",
            encoding="utf-8",
        )

