"""Artifact browsing routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.auth import current_user, get_settings, get_store
from app.schemas import ArtifactContentResponse, ArtifactListResponse
from app.services.artifacts import load_artifact_preview, scan_artifacts

router = APIRouter()


@router.get("", response_model=ArtifactListResponse)
async def list_artifacts(
    request: Request,
    q: str = Query(default=""),
    limit: int = Query(default=60, ge=1, le=250),
    _: dict = Depends(current_user),
) -> ArtifactListResponse:
    store = get_store(request)
    settings_payload = store.get_settings()
    settings = get_settings(request)
    items = scan_artifacts(
        settings=settings,
        workspace_roots=settings_payload.get("workspace_roots") or [],
        artifact_dirs=settings_payload.get("artifact_dirs") or [],
        query=q,
        limit=limit,
    )
    return ArtifactListResponse(items=items, total=len(items), query=q)


@router.get("/content", response_model=ArtifactContentResponse)
async def get_artifact_content(
    request: Request,
    path: str = Query(..., min_length=1),
    _: dict = Depends(current_user),
) -> ArtifactContentResponse:
    store = get_store(request)
    settings_payload = store.get_settings()
    try:
        return load_artifact_preview(
            settings=get_settings(request),
            workspace_roots=settings_payload.get("workspace_roots") or [],
            raw_path=path,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
