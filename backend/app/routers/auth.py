"""Authentication routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.auth import (
    clear_session_cookie,
    current_user,
    get_settings,
    get_store,
    set_session_cookie,
    user_to_schema,
    verify_password,
)
from app.schemas import LoginRequest, SessionOut
from app.storage import iso_now

router = APIRouter()


@router.post("/login", response_model=SessionOut)
async def login(body: LoginRequest, response: Response, request: Request) -> SessionOut:
    store = get_store(request)
    settings = get_settings(request)
    user = store.get_user_by_email(body.email)
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    session = store.create_session(user["id"])
    user["last_login_at"] = iso_now()
    user["updated_at"] = iso_now()
    store.save_user(user)

    expires_at = datetime.fromisoformat(session["expires_at"])
    set_session_cookie(response, settings, session["id"], expires_at)
    return SessionOut(user=user_to_schema(user), expires_at=expires_at)


@router.post("/logout")
async def logout(response: Response, request: Request) -> dict[str, str]:
    settings = get_settings(request)
    store = get_store(request)
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if session_id:
        store.delete_session(session_id)
    clear_session_cookie(response, settings)
    return {"status": "ok"}


@router.get("/me", response_model=SessionOut)
async def me(request: Request, user: dict = Depends(current_user)) -> SessionOut:
    settings = get_settings(request)
    store = get_store(request)
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    session = store.get_session(session_id or "")
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    return SessionOut(
        user=user_to_schema(user),
        expires_at=datetime.fromisoformat(session["expires_at"]),
    )
