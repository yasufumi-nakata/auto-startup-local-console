"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth import ensure_bootstrap_admin, resolve_user_for_session
from app.config import Settings
from app.routers import api_router
from app.schemas import HealthResponse
from app.services.task_events import TaskEventManager
from app.services.task_runner import LocalTaskRunner
from app.storage import FileStateStore


class AppContainer:
    """Shared application services attached to app.state."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.store = FileStateStore(settings)
        ensure_bootstrap_admin(self.store, settings)
        self.events = TaskEventManager(settings.events_dir)
        self.runner = LocalTaskRunner(settings, self.store, self.events)


def create_app(app_settings: Settings | None = None) -> FastAPI:
    settings = app_settings or Settings()
    container = AppContainer(settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await container.runner.start()
        yield
        await container.runner.stop()

    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.container = container

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    @app.get("/api/health", response_model=HealthResponse, tags=["health"])
    async def health() -> JSONResponse:
        return JSONResponse(HealthResponse(status="ok").model_dump())

    @app.websocket("/ws/tasks")
    async def ws_task_updates(ws: WebSocket) -> None:
        cookie_header = ws.headers.get("cookie", "")
        session_id = None
        for chunk in cookie_header.split(";"):
            name, _, value = chunk.strip().partition("=")
            if name == container.settings.SESSION_COOKIE_NAME:
                session_id = value
                break
        user = resolve_user_for_session(container.store, session_id)
        if not user:
            await ws.close(code=4401)
            return

        await container.events.connect(ws)
        try:
            while True:
                await ws.receive_text()
        except WebSocketDisconnect:
            await container.events.disconnect(ws)

    return app


app = create_app()
