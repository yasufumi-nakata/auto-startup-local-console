"""Shared local settings routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.auth import admin_user, current_user, get_store
from app.schemas import LocalSettings, LocalSettingsUpdate
from app.storage import iso_now

router = APIRouter()


@router.get("", response_model=LocalSettings)
async def get_settings_route(request: Request, _: dict = Depends(current_user)) -> LocalSettings:
    return LocalSettings.model_validate(get_store(request).get_settings())


@router.put("", response_model=LocalSettings)
async def update_settings_route(
    body: LocalSettingsUpdate,
    request: Request,
    user: dict = Depends(admin_user),
) -> LocalSettings:
    store = get_store(request)
    payload = {
        **body.model_dump(),
        "updated_at": iso_now(),
        "updated_by": user["email"],
    }
    store.save_settings(payload)
    return LocalSettings.model_validate(payload)
