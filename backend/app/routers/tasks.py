"""Task management routes."""

from __future__ import annotations

import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.auth import current_user, get_store
from app.schemas import TaskCreate, TaskEventOut, TaskOut, TaskStats
from app.storage import iso_now

router = APIRouter()


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    request: Request,
    status: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    _: dict = Depends(current_user),
) -> list[TaskOut]:
    tasks = get_store(request).list_tasks()
    if status:
        tasks = [task for task in tasks if task.get("status") == status]
    if type:
        tasks = [task for task in tasks if task.get("type") == type]
    return [TaskOut.model_validate(task) for task in tasks]


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    body: TaskCreate,
    request: Request,
    user: dict = Depends(current_user),
) -> TaskOut:
    task = {
        "id": secrets.token_urlsafe(12),
        "type": body.type,
        "prompt": body.prompt,
        "working_dir": body.working_dir,
        "status": "queued",
        "result": None,
        "retries": 0,
        "max_retries": body.max_retries,
        "created_at": iso_now(),
        "completed_at": None,
        "created_by": user["id"],
        "created_by_name": user["name"],
    }
    container = request.app.state.container
    container.store.save_task(task)
    await container.events.publish_task_event(task, event="task.created")
    return TaskOut.model_validate(task)


@router.get("/stats", response_model=TaskStats)
async def task_stats(request: Request, _: dict = Depends(current_user)) -> TaskStats:
    tasks = get_store(request).list_tasks()
    counts = {key: 0 for key in ("queued", "running", "completed", "failed", "cancelled")}
    durations: list[float] = []
    retries = 0
    for task in tasks:
        counts[task["status"]] = counts.get(task["status"], 0) + 1
        retries += int(task.get("retries") or 0)
        if task.get("status") == "completed" and task.get("completed_at"):
            start = datetime.fromisoformat(task["created_at"])
            end = datetime.fromisoformat(task["completed_at"])
            durations.append((end - start).total_seconds())
    avg_duration = sum(durations) / len(durations) if durations else None
    return TaskStats(
        total=len(tasks),
        queued=counts["queued"],
        running=counts["running"],
        completed=counts["completed"],
        failed=counts["failed"],
        cancelled=counts["cancelled"],
        avg_duration_secs=round(avg_duration, 2) if avg_duration is not None else None,
        total_retries=retries,
    )


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, request: Request, _: dict = Depends(current_user)) -> TaskOut:
    task = get_store(request).get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskOut.model_validate(task)


@router.get("/{task_id}/events", response_model=list[TaskEventOut])
async def get_task_events(task_id: str, request: Request, _: dict = Depends(current_user)) -> list[TaskEventOut]:
    container = request.app.state.container
    task = container.store.get_task(task_id)
    events = container.events.get_recent_events(task_id)
    if not task and not events:
        raise HTTPException(status_code=404, detail="Task not found")
    return [TaskEventOut.model_validate(event) for event in events]


@router.post("/{task_id}/retry", response_model=TaskOut)
async def retry_task(task_id: str, request: Request, _: dict = Depends(current_user)) -> TaskOut:
    container = request.app.state.container
    task = container.store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] != "failed":
        raise HTTPException(status_code=400, detail="Only failed tasks can be retried")
    task["status"] = "queued"
    task["retries"] = int(task.get("retries") or 0) + 1
    task["completed_at"] = None
    container.store.save_task(task)
    await container.events.publish_task_event(task, event="task.updated", reason="retried")
    return TaskOut.model_validate(task)


@router.delete("/{task_id}", response_model=TaskOut)
async def cancel_task(task_id: str, request: Request, _: dict = Depends(current_user)) -> TaskOut:
    container = request.app.state.container
    task = container.store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] in ("completed", "failed"):
        raise HTTPException(status_code=400, detail="Cannot cancel a finished task")
    if task["status"] == "cancelled":
        return TaskOut.model_validate(task)

    await container.runner.cancel_task(task_id)
    task["status"] = "cancelled"
    task["completed_at"] = iso_now()
    task["result"] = "Cancellation requested by user."
    container.store.save_task(task)
    await container.events.publish_task_event(task, event="task.updated", reason="cancelled_by_user")
    return TaskOut.model_validate(task)
