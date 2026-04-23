"""Application configuration for the local control-plane backend."""

from __future__ import annotations

import os
import shutil
import ssl
from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration loaded from environment variables."""

    APP_NAME: str = "auto-startup local console"
    REPO_ROOT: Path = Path(__file__).resolve().parents[2]
    DATA_DIR: Path = Path(__file__).resolve().parents[2] / "backend" / "data"
    CORS_ORIGINS: List[str] = [
        "http://127.0.0.1:3010",
        "http://localhost:3010",
    ]

    SESSION_COOKIE_NAME: str = "auto_startup_local_session"
    SESSION_DURATION_HOURS: int = 24 * 7
    PASSWORD_HASH_ITERATIONS: int = 600_000

    BOOTSTRAP_ADMIN_EMAIL: str = "admin@local"
    BOOTSTRAP_ADMIN_NAME: str = "Local Admin"
    BOOTSTRAP_ADMIN_PASSWORD: str = ""

    WORKSPACE_ROOTS: List[str] = ["../auto-startup"]
    ARTIFACT_INCLUDE_DIRS: List[str] = [
        "drafts",
        "grant-prep",
        "quality_reports",
        "reports",
        "submissions",
    ]
    ARTIFACT_ALLOWED_EXTENSIONS: List[str] = [
        ".md",
        ".txt",
        ".json",
        ".yaml",
        ".yml",
        ".csv",
        ".pdf",
    ]
    ARTIFACT_PREVIEW_MAX_BYTES: int = 120_000
    ARTIFACT_SCAN_LIMIT: int = 250

    CODEX_PATH: str = "codex"
    CODEX_TIMEOUT_DEFAULT: int = 900
    CODEX_TIMEOUT_REVIEW: int = 600
    CODEX_TIMEOUT_ANALYSIS: int = 1800
    CODEX_TIMEOUT_AUTOMATION: int = 1200
    MAX_PARALLEL_TASKS: int = 3
    TASK_POLL_INTERVAL_SECS: int = 3
    CODEX_REASONING_EFFORT_REVIEW: str = "medium"

    model_config = {
        "env_prefix": "AUTOSTARTUP_LOCAL_",
        "env_file": ".env",
        "extra": "ignore",
    }

    @field_validator("WORKSPACE_ROOTS", mode="before")
    @classmethod
    def _split_workspace_roots(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("ARTIFACT_INCLUDE_DIRS", mode="before")
    @classmethod
    def _split_include_dirs(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("ARTIFACT_ALLOWED_EXTENSIONS", mode="before")
    @classmethod
    def _split_extensions(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def users_path(self) -> Path:
        return self.DATA_DIR / "users.json"

    @property
    def sessions_path(self) -> Path:
        return self.DATA_DIR / "sessions.json"

    @property
    def settings_path(self) -> Path:
        return self.DATA_DIR / "settings.json"

    @property
    def tasks_path(self) -> Path:
        return self.DATA_DIR / "tasks.json"

    @property
    def events_dir(self) -> Path:
        return self.DATA_DIR / "task-events"

    @property
    def bootstrap_credentials_path(self) -> Path:
        return self.DATA_DIR / "bootstrap-admin.txt"

    def ensure_data_dirs(self) -> None:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.events_dir.mkdir(parents=True, exist_ok=True)

    def resolve_workspace_roots(self, configured_roots: list[str] | None = None) -> list[Path]:
        roots = configured_roots or self.WORKSPACE_ROOTS
        resolved: list[Path] = []
        for raw in roots:
            candidate = Path(raw).expanduser()
            if not candidate.is_absolute():
                candidate = (self.REPO_ROOT / candidate).resolve()
            else:
                candidate = candidate.resolve()
            if candidate.exists():
                resolved.append(candidate)
        deduped: list[Path] = []
        seen: set[str] = set()
        for item in resolved:
            key = str(item)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped

    def resolve_executable(self, command: str) -> Path | None:
        command = str(command or "").strip()
        if not command:
            return None

        candidate = Path(command).expanduser()
        if candidate.is_absolute() or "/" in command:
            if candidate.exists() and os.access(candidate, os.X_OK):
                return candidate
            return None

        discovered = shutil.which(command)
        if discovered:
            return Path(discovered)

        for directory in (
            Path.home() / ".local" / "bin",
            Path.home() / "bin",
            Path("/opt/homebrew/bin"),
            Path("/usr/local/bin"),
        ):
            path = directory / command
            if path.exists() and os.access(path, os.X_OK):
                return path
        return None

    def resolved_codex_path(self) -> str | None:
        path = self.resolve_executable(self.CODEX_PATH)
        return str(path) if path else None

    def codex_available(self) -> bool:
        return self.resolved_codex_path() is not None

    def codex_timeout_for_task(self, task_type: str) -> int:
        if task_type == "review":
            return self.CODEX_TIMEOUT_REVIEW
        if task_type == "code_analysis":
            return self.CODEX_TIMEOUT_ANALYSIS
        if task_type == "automation":
            return self.CODEX_TIMEOUT_AUTOMATION
        return self.CODEX_TIMEOUT_DEFAULT

    def codex_cli_overrides_for_task(self, task_type: str) -> list[str]:
        if task_type != "review":
            return []
        effort = str(self.CODEX_REASONING_EFFORT_REVIEW or "").strip()
        if not effort:
            return []
        return ["-c", f'model_reasoning_effort="{effort}"']

    def codex_subprocess_env(self) -> dict[str, str]:
        env = os.environ.copy()
        env.setdefault("PYTHONUNBUFFERED", "1")
        env.setdefault("TOKENIZERS_PARALLELISM", "false")

        verify_paths = ssl.get_default_verify_paths()
        ca_candidates = [
            env.get("SSL_CERT_FILE", "").strip(),
            verify_paths.cafile,
            "/etc/ssl/cert.pem",
            "/private/etc/ssl/cert.pem",
        ]
        ca_file = next((path for path in ca_candidates if path and Path(path).is_file()), None)
        if ca_file:
            for key in ("SSL_CERT_FILE", "OPENSSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
                env.setdefault(key, ca_file)
            env.setdefault("NODE_EXTRA_CA_CERTS", ca_file)
        return env

