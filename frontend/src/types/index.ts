export type UserRole = "admin" | "member";
export type TaskType = "code_analysis" | "writing" | "review" | "automation";
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface SessionPayload {
  user: User;
  expires_at: string;
}

export interface ArtifactItem {
  path: string;
  display_path: string;
  workspace_root: string;
  category: string;
  extension: string;
  size_bytes: number;
  modified_at: string;
}

export interface ArtifactListResponse {
  items: ArtifactItem[];
  total: number;
  query: string;
}

export interface ArtifactContent {
  path: string;
  display_path: string;
  workspace_root: string;
  extension: string;
  content_type: "text" | "binary" | "pdf";
  preview: string | null;
  truncated: boolean;
  size_bytes: number;
  modified_at: string;
}

export interface WorkspaceHealth {
  root: string;
  exists: boolean;
  readable: boolean;
  artifact_count: number;
}

export interface DashboardSummary {
  codex_available: boolean;
  workspace_count: number;
  artifact_count: number;
  users_total: number;
  users_active: number;
  tasks_total: number;
  tasks_running: number;
  latest_artifacts: ArtifactItem[];
  workspace_health: WorkspaceHealth[];
}

export interface LocalSettings {
  workspace_roots: string[];
  artifact_dirs: string[];
  default_working_dir: string;
  default_prompt_prefix: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface Task {
  id: string;
  type: TaskType;
  prompt: string;
  working_dir: string | null;
  status: TaskStatus;
  result: string | null;
  retries: number;
  max_retries: number;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
}

export interface TaskStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  avg_duration_secs: number | null;
  total_retries: number;
}

export interface TaskEvent {
  event: string;
  timestamp: string;
  task_id?: string | null;
  stream?: string | null;
  message?: string | null;
  reason?: string | null;
  task?: Task | null;
}
