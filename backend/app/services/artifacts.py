"""Artifact scanning and preview helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.config import Settings
from app.schemas import ArtifactContentResponse, ArtifactItem, WorkspaceHealth

SKIP_DIRS = {".git", "node_modules", ".next", ".venv", "__pycache__", ".pytest_cache"}
TEXT_EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml", ".csv"}


def _utc_timestamp(path: Path) -> datetime:
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)


def _artifact_item(root: Path, category: str, path: Path) -> ArtifactItem:
    return ArtifactItem(
        path=str(path),
        display_path=str(path.relative_to(root)),
        workspace_root=str(root),
        category=category,
        extension=path.suffix.lower(),
        size_bytes=path.stat().st_size,
        modified_at=_utc_timestamp(path),
    )


def scan_artifacts(
    settings: Settings,
    workspace_roots: list[str],
    artifact_dirs: list[str],
    query: str = "",
    limit: int | None = None,
) -> list[ArtifactItem]:
    matched: list[ArtifactItem] = []
    query_lower = query.strip().lower()
    allowed_extensions = {value.lower() for value in settings.ARTIFACT_ALLOWED_EXTENSIONS}
    roots = settings.resolve_workspace_roots(workspace_roots)
    max_items = limit or settings.ARTIFACT_SCAN_LIMIT

    for root in roots:
        for category in artifact_dirs:
            base = root / category
            if not base.exists():
                continue
            for current_root, dirnames, filenames in __import__("os").walk(base):
                dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
                current = Path(current_root)
                for filename in filenames:
                    path = current / filename
                    if path.suffix.lower() not in allowed_extensions:
                        continue
                    item = _artifact_item(root, category, path)
                    haystack = f"{item.display_path} {item.category}".lower()
                    if query_lower and query_lower not in haystack:
                        continue
                    matched.append(item)
                    if len(matched) >= max_items * 3:
                        break
                if len(matched) >= max_items * 3:
                    break
    matched.sort(key=lambda item: item.modified_at, reverse=True)
    return matched[:max_items]


def resolve_safe_path(settings: Settings, workspace_roots: list[str], raw_path: str) -> Path:
    candidate = Path(raw_path).expanduser().resolve()
    for root in settings.resolve_workspace_roots(workspace_roots):
        try:
            candidate.relative_to(root)
            return candidate
        except ValueError:
            continue
    raise FileNotFoundError("Artifact path is outside configured workspace roots")


def load_artifact_preview(
    settings: Settings,
    workspace_roots: list[str],
    raw_path: str,
) -> ArtifactContentResponse:
    path = resolve_safe_path(settings, workspace_roots, raw_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError("Artifact not found")

    root = next(
        root for root in settings.resolve_workspace_roots(workspace_roots)
        if str(path).startswith(str(root))
    )
    suffix = path.suffix.lower()
    content_type = "text"
    preview = None
    truncated = False
    if suffix == ".pdf":
        content_type = "pdf"
    elif suffix not in TEXT_EXTENSIONS:
        content_type = "binary"
    else:
        content = path.read_text(encoding="utf-8", errors="replace")
        truncated = len(content.encode("utf-8")) > settings.ARTIFACT_PREVIEW_MAX_BYTES
        preview = content[: settings.ARTIFACT_PREVIEW_MAX_BYTES]

    return ArtifactContentResponse(
        path=str(path),
        display_path=str(path.relative_to(root)),
        workspace_root=str(root),
        extension=suffix,
        content_type=content_type,
        preview=preview,
        truncated=truncated,
        size_bytes=path.stat().st_size,
        modified_at=_utc_timestamp(path),
    )


def workspace_health(
    settings: Settings,
    workspace_roots: list[str],
    artifact_dirs: list[str],
) -> list[WorkspaceHealth]:
    health_rows: list[WorkspaceHealth] = []
    for root in settings.resolve_workspace_roots(workspace_roots):
        count = 0
        for category in artifact_dirs:
            path = root / category
            if path.exists():
                count += 1
        health_rows.append(
            WorkspaceHealth(
                root=str(root),
                exists=root.exists(),
                readable=root.exists(),
                artifact_count=count,
            )
        )
    return health_rows
