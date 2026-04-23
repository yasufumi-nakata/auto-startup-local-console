from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_client(tmp_path: Path) -> TestClient:
    workspace = tmp_path / "workspace"
    (workspace / "drafts").mkdir(parents=True, exist_ok=True)
    (workspace / "drafts" / "latest_draft.md").write_text("# hello\nartifact body\n", encoding="utf-8")

    settings = Settings(
        DATA_DIR=tmp_path / "data",
        WORKSPACE_ROOTS=[str(workspace)],
        ARTIFACT_INCLUDE_DIRS=["drafts"],
        BOOTSTRAP_ADMIN_PASSWORD="test-password-123",
    )
    return TestClient(create_app(settings))


def test_artifact_listing_and_preview(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    client.post("/api/auth/login", json={"email": "admin@local", "password": "test-password-123"})

    listing = client.get("/api/artifacts")
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert items
    target = items[0]["path"]

    preview = client.get("/api/artifacts/content", params={"path": target})
    assert preview.status_code == 200
    assert "artifact body" in preview.json()["preview"]
