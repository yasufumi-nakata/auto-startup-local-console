"""Dashboard summary routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.auth import current_user, get_settings, get_store
from app.schemas import DashboardSummary
from app.services.artifacts import scan_artifacts, workspace_health

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(request: Request, _: dict = Depends(current_user)) -> DashboardSummary:
    store = get_store(request)
    settings = get_settings(request)
    settings_payload = store.get_settings()
    artifact_items = scan_artifacts(
        settings=settings,
        workspace_roots=settings_payload.get("workspace_roots") or [],
        artifact_dirs=settings_payload.get("artifact_dirs") or [],
        limit=8,
    )
    users = store.list_users()
    tasks = store.list_tasks()
    running = [task for task in tasks if task.get("status") == "running"]
    return DashboardSummary(
        codex_available=settings.codex_available(),
        workspace_count=len(settings.resolve_workspace_roots(settings_payload.get("workspace_roots") or [])),
        artifact_count=len(artifact_items),
        users_total=len(users),
        users_active=len([user for user in users if user.get("is_active", True)]),
        tasks_total=len(tasks),
        tasks_running=len(running),
        latest_artifacts=artifact_items,
        workspace_health=workspace_health(
            settings=settings,
            workspace_roots=settings_payload.get("workspace_roots") or [],
            artifact_dirs=settings_payload.get("artifact_dirs") or [],
        ),
    )
