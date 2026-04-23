"""Pydantic schemas used by the backend API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

TaskType = Literal["code_analysis", "writing", "review", "automation"]
TaskStatus = Literal["queued", "running", "completed", "failed", "cancelled"]
UserRole = Literal["admin", "member"]


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None


class UserCreate(BaseModel):
    email: str = Field(..., min_length=3)
    name: str = Field(..., min_length=1)
    role: UserRole = "member"
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class SessionOut(BaseModel):
    user: UserOut
    expires_at: datetime


class LocalSettings(BaseModel):
    workspace_roots: list[str] = Field(default_factory=list)
    artifact_dirs: list[str] = Field(default_factory=list)
    default_working_dir: str = ""
    default_prompt_prefix: str = ""
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class LocalSettingsUpdate(BaseModel):
    workspace_roots: list[str] = Field(default_factory=list)
    artifact_dirs: list[str] = Field(default_factory=list)
    default_working_dir: str = ""
    default_prompt_prefix: str = ""


class ArtifactItem(BaseModel):
    path: str
    display_path: str
    workspace_root: str
    category: str
    extension: str
    size_bytes: int
    modified_at: datetime


class ArtifactListResponse(BaseModel):
    items: list[ArtifactItem]
    total: int
    query: str = ""


class ArtifactContentResponse(BaseModel):
    path: str
    display_path: str
    workspace_root: str
    extension: str
    content_type: Literal["text", "binary", "pdf"]
    preview: Optional[str] = None
    truncated: bool = False
    size_bytes: int
    modified_at: datetime


class WorkspaceHealth(BaseModel):
    root: str
    exists: bool
    readable: bool
    artifact_count: int


class DashboardSummary(BaseModel):
    codex_available: bool
    workspace_count: int
    artifact_count: int
    users_total: int
    users_active: int
    tasks_total: int
    tasks_running: int
    latest_artifacts: list[ArtifactItem]
    workspace_health: list[WorkspaceHealth]


class HealthResponse(BaseModel):
    status: Literal["ok"]


class TaskOut(BaseModel):
    id: str
    type: TaskType
    prompt: str
    working_dir: Optional[str] = None
    status: TaskStatus
    result: Optional[str] = None
    retries: int = 0
    max_retries: int = 3
    created_at: datetime
    completed_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None


class TaskCreate(BaseModel):
    type: TaskType
    prompt: str = Field(..., min_length=1)
    working_dir: Optional[str] = None
    max_retries: int = Field(default=3, ge=0, le=10)


class TaskStats(BaseModel):
    total: int = 0
    queued: int = 0
    running: int = 0
    completed: int = 0
    failed: int = 0
    cancelled: int = 0
    avg_duration_secs: Optional[float] = None
    total_retries: int = 0


class TaskEventOut(BaseModel):
    event: str
    timestamp: datetime
    task_id: Optional[str] = None
    stream: Optional[str] = None
    message: Optional[str] = None
    task: Optional[dict] = None
    reason: Optional[str] = None

