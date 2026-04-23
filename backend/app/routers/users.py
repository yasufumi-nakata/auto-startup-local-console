"""User management routes."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth import admin_user, get_settings, get_store, hash_password, user_to_schema
from app.schemas import UserCreate, UserOut, UserUpdate
from app.storage import iso_now

router = APIRouter()


@router.get("", response_model=list[UserOut])
async def list_users(request: Request, _: dict = Depends(admin_user)) -> list[UserOut]:
    store = get_store(request)
    return [user_to_schema(user) for user in store.list_users()]


@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    body: UserCreate,
    request: Request,
    _: dict = Depends(admin_user),
) -> UserOut:
    store = get_store(request)
    settings = get_settings(request)
    if store.get_user_by_email(body.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    now = iso_now()
    user = {
        "id": secrets.token_urlsafe(12),
        "email": body.email.strip().lower(),
        "name": body.name.strip(),
        "role": body.role,
        "password_hash": hash_password(body.password, settings.PASSWORD_HASH_ITERATIONS),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
    }
    store.save_user(user)
    return user_to_schema(user)


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    body: UserUpdate,
    request: Request,
    current_admin: dict = Depends(admin_user),
) -> UserOut:
    store = get_store(request)
    settings = get_settings(request)
    user = store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        user["name"] = body.name.strip()
    if body.role is not None:
        user["role"] = body.role
    if body.is_active is not None:
        if user["id"] == current_admin["id"] and body.is_active is False:
            raise HTTPException(status_code=400, detail="You cannot disable the current admin session user")
        user["is_active"] = body.is_active
        if body.is_active is False:
            store.delete_sessions_for_user(user["id"])
    if body.password is not None:
        user["password_hash"] = hash_password(body.password, settings.PASSWORD_HASH_ITERATIONS)
    user["updated_at"] = iso_now()
    store.save_user(user)
    return user_to_schema(user)
