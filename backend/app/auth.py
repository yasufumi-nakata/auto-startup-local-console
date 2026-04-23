"""Authentication helpers for password hashing and session resolution."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime
from typing import Annotated, Optional

from fastapi import Cookie, Depends, HTTPException, Request, Response, status

from app.config import Settings
from app.schemas import UserOut
from app.storage import FileStateStore, iso_now


def hash_password(password: str, iterations: int) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, iterations_raw, salt_hex, digest_hex = encoded.split("$", 3)
        iterations = int(iterations_raw)
        expected = bytes.fromhex(digest_hex)
        salt = bytes.fromhex(salt_hex)
    except (ValueError, TypeError):
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)


def user_to_schema(user: dict) -> UserOut:
    return UserOut.model_validate(user)


def get_container(request: Request):
    return request.app.state.container


def get_settings(request: Request) -> Settings:
    return get_container(request).settings


def get_store(request: Request) -> FileStateStore:
    return get_container(request).store


def ensure_bootstrap_admin(store: FileStateStore, settings: Settings) -> None:
    if store.list_users():
        return

    password = store.bootstrap_admin_password()
    now = iso_now()
    admin = {
        "id": secrets.token_urlsafe(12),
        "email": settings.BOOTSTRAP_ADMIN_EMAIL,
        "name": settings.BOOTSTRAP_ADMIN_NAME,
        "role": "admin",
        "password_hash": hash_password(password, settings.PASSWORD_HASH_ITERATIONS),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
    }
    store.save_user(admin)
    store.write_bootstrap_credentials(admin["email"], password)


def set_session_cookie(response: Response, settings: Settings, session_id: str, expires_at: datetime) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,
        expires=expires_at,
        path="/",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME, path="/")


def resolve_user_for_session(store: FileStateStore, session_id: Optional[str]) -> Optional[dict]:
    if not session_id:
        return None
    session = store.get_session(session_id)
    if not session:
        return None
    user = store.get_user(session["user_id"])
    if not user or not user.get("is_active", True):
        return None
    return user


def _unauthorized(detail: str = "Authentication required") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


async def current_user(
    request: Request,
    session_id: Annotated[Optional[str], Cookie(alias="auto_startup_local_session")] = None,
) -> dict:
    settings = get_settings(request)
    actual_session_id = session_id
    if settings.SESSION_COOKIE_NAME != "auto_startup_local_session":
        actual_session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    store = get_store(request)
    user = resolve_user_for_session(store, actual_session_id)
    if not user:
        raise _unauthorized()
    return user


async def optional_user(request: Request) -> Optional[dict]:
    settings = get_settings(request)
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    store = get_store(request)
    return resolve_user_for_session(store, session_id)


async def admin_user(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
