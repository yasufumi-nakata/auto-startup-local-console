from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_client(tmp_path: Path) -> TestClient:
    settings = Settings(
        DATA_DIR=tmp_path / "data",
        WORKSPACE_ROOTS=[str(tmp_path / "workspace")],
        CORS_ORIGINS=["http://127.0.0.1:3010"],
        BOOTSTRAP_ADMIN_PASSWORD="test-password-123",
    )
    (tmp_path / "workspace").mkdir(parents=True, exist_ok=True)
    return TestClient(create_app(settings))


def test_bootstrap_admin_can_login_and_read_self(tmp_path: Path) -> None:
    client = make_client(tmp_path)

    response = client.post(
        "/api/auth/login",
        json={"email": "admin@local", "password": "test-password-123"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "admin@local"


def test_admin_can_create_member_user(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    client.post("/api/auth/login", json={"email": "admin@local", "password": "test-password-123"})

    created = client.post(
        "/api/users",
        json={
            "email": "member@example.com",
            "name": "Member",
            "role": "member",
            "password": "member-password-123",
        },
    )
    assert created.status_code == 201
    assert created.json()["email"] == "member@example.com"
