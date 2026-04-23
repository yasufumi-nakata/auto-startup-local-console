"""Router registration for the backend API."""

from fastapi import APIRouter

from app.routers.artifacts import router as artifacts_router
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.settings import router as settings_router
from app.routers.tasks import router as tasks_router
from app.routers.users import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/api/auth", tags=["auth"])
api_router.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
api_router.include_router(artifacts_router, prefix="/api/artifacts", tags=["artifacts"])
api_router.include_router(settings_router, prefix="/api/settings", tags=["settings"])
api_router.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
api_router.include_router(users_router, prefix="/api/users", tags=["users"])
