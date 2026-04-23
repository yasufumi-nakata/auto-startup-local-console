"""Background worker that executes queued local Codex tasks."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from app.config import Settings
from app.storage import FileStateStore
from app.services.task_events import TaskEventManager

MAX_STREAM_BUFFER = 120_000


class LocalTaskRunner:
    """File-backed task runner for local Codex execution."""

    def __init__(self, settings: Settings, store: FileStateStore, events: TaskEventManager) -> None:
        self.settings = settings
        self.store = store
        self.events = events
        self._running = False
        self._loop_task: asyncio.Task[None] | None = None
        self._active_processes: dict[str, asyncio.subprocess.Process] = {}
        self._cancel_requested: set[str] = set()

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        for task in self.store.recent_tasks_by_status("running"):
            task["status"] = "queued"
            task["completed_at"] = None
            self.store.save_task(task)
        self._loop_task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass

    async def _loop(self) -> None:
        while self._running:
            try:
                await self._poll_and_dispatch()
            except Exception:
                pass
            await asyncio.sleep(max(1, int(self.settings.TASK_POLL_INTERVAL_SECS)))

    async def _poll_and_dispatch(self) -> None:
        active = sum(1 for process in self._active_processes.values() if process.returncode is None)
        slots = max(0, self.settings.MAX_PARALLEL_TASKS - active)
        if slots <= 0:
            return

        queued = [task for task in self.store.list_tasks() if task.get("status") == "queued"]
        for task in queued[:slots]:
            task["status"] = "running"
            self.store.save_task(task)
            await self.events.publish_task_event(task, event="task.updated")
            asyncio.create_task(self._execute_task(task["id"]))

    async def cancel_task(self, task_id: str) -> None:
        self._cancel_requested.add(task_id)
        process = self._active_processes.get(task_id)
        if process and process.returncode is None:
            try:
                process.terminate()
            except ProcessLookupError:
                return

    async def _stream_output(
        self,
        task_id: str,
        stream_name: str,
        stream: asyncio.StreamReader | None,
        collector: list[str],
    ) -> None:
        if stream is None:
            return
        while True:
            chunk = await stream.readline()
            if not chunk:
                break
            text = chunk.decode("utf-8", errors="replace")
            collector.append(text)
            joined = "".join(collector)
            if len(joined) > MAX_STREAM_BUFFER:
                del collector[: len(collector) // 2]
            await self.events.publish_output(task_id, stream_name, text)

    async def _execute_task(self, task_id: str) -> None:
        task = self.store.get_task(task_id)
        if not task:
            return

        codex_path = self.settings.resolved_codex_path()
        if codex_path is None:
            task["status"] = "failed"
            task["completed_at"] = datetime.now(timezone.utc).isoformat()
            task["result"] = f"Codex executable '{self.settings.CODEX_PATH}' was not found."
            self.store.save_task(task)
            await self.events.publish_task_event(task, event="task.updated", reason="codex_missing")
            return

        settings_payload = self.store.get_settings()
        default_dir = settings_payload.get("default_working_dir") or ""
        workspace_roots = self.settings.resolve_workspace_roots(settings_payload.get("workspace_roots"))
        working_dir = task.get("working_dir") or default_dir or (str(workspace_roots[0]) if workspace_roots else str(self.settings.REPO_ROOT))
        work_path = Path(working_dir).expanduser()
        work_path.mkdir(parents=True, exist_ok=True)

        prompt_prefix = settings_payload.get("default_prompt_prefix") or ""
        prompt = task["prompt"]
        if prompt_prefix.strip():
            prompt = f"{prompt_prefix.strip()}\n\n{prompt}"

        cmd = [
            codex_path,
            "exec",
            *self.settings.codex_cli_overrides_for_task(task["type"]),
            "--full-auto",
            "--skip-git-repo-check",
            prompt,
        ]

        stdout_parts: list[str] = []
        stderr_parts: list[str] = []
        proc: asyncio.subprocess.Process | None = None
        returncode = -1
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(work_path),
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self.settings.codex_subprocess_env(),
                start_new_session=True,
            )
            self._active_processes[task_id] = proc
            stdout_reader = asyncio.create_task(self._stream_output(task_id, "stdout", proc.stdout, stdout_parts))
            stderr_reader = asyncio.create_task(self._stream_output(task_id, "stderr", proc.stderr, stderr_parts))
            returncode = await asyncio.wait_for(proc.wait(), timeout=self.settings.codex_timeout_for_task(task["type"]))
            await stdout_reader
            await stderr_reader
        except asyncio.TimeoutError:
            if proc and proc.returncode is None:
                proc.kill()
                await proc.wait()
            task["status"] = "failed"
            task["result"] = "Task timed out."
        except Exception as exc:
            task["status"] = "failed"
            task["result"] = f"Task execution failed: {exc}"
        else:
            cancelled = task_id in self._cancel_requested
            if cancelled:
                task["status"] = "cancelled"
                task["result"] = "Cancellation requested by user."
            elif returncode == 0:
                task["status"] = "completed"
                task["result"] = "".join(stdout_parts).strip()[-20000:] or "Completed successfully."
            else:
                task["status"] = "failed"
                combined = "".join(stderr_parts).strip() or "".join(stdout_parts).strip()
                task["result"] = combined[-20000:] or f"Exited with return code {returncode}."
        finally:
            self._active_processes.pop(task_id, None)
            self._cancel_requested.discard(task_id)

        task["completed_at"] = datetime.now(timezone.utc).isoformat()
        self.store.save_task(task)
        await self.events.publish_task_event(task, event="task.updated", returncode=returncode)
