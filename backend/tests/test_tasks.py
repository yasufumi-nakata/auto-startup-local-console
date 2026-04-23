from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_client(tmp_path: Path) -> TestClient:
    workspace = tmp_path / "workspace"
    workspace.mkdir(parents=True, exist_ok=True)
    settings = Settings(
        DATA_DIR=tmp_path / "data",
        WORKSPACE_ROOTS=[str(workspace)],
        BOOTSTRAP_ADMIN_PASSWORD="test-password-123",
        CODEX_PATH="this-command-does-not-exist",
    )
    return TestClient(create_app(settings))


def test_queued_task_created_and_exposed(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    client.post("/api/auth/login", json={"email": "admin@local", "password": "test-password-123"})

    created = client.post(
        "/api/tasks",
        json={
            "type": "code_analysis",
            "prompt": "Check this repo",
            "working_dir": str(tmp_path / "workspace"),
            "max_retries": 2,
        },
    )
    assert created.status_code == 201
    task_id = created.json()["id"]

    fetched = client.get(f"/api/tasks/{task_id}")
    assert fetched.status_code == 200
    assert fetched.json()["status"] == "queued"
