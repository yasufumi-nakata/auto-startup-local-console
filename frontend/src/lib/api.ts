import type {
  ArtifactContent,
  ArtifactListResponse,
  DashboardSummary,
  LocalSettings,
  SessionPayload,
  Task,
  TaskEvent,
  TaskStats,
  User,
} from "@/types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/backend").replace(/\/$/, "");

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE) {
    return normalizedPath;
  }
  if (isAbsoluteUrl(API_BASE)) {
    return `${API_BASE}${normalizedPath}`;
  }
  return `${API_BASE}${normalizedPath}`;
}

export function buildWebSocketUrl(path: string): string {
  const target = resolveApiUrl(path);
  const base =
    typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3010";
  const url = new URL(target, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export class APIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(resolveApiUrl(path), {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new APIError(text || res.statusText, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function login(email: string, password: string): Promise<SessionPayload> {
  return fetchAPI<SessionPayload>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<{ status: string }> {
  return fetchAPI<{ status: string }>("/api/auth/logout", { method: "POST" });
}

export function getSession(): Promise<SessionPayload> {
  return fetchAPI<SessionPayload>("/api/auth/me");
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchAPI<DashboardSummary>("/api/dashboard/summary");
}

export function listArtifacts(query = "", limit = 60): Promise<ArtifactListResponse> {
  const qs = new URLSearchParams();
  if (query.trim()) qs.set("q", query.trim());
  qs.set("limit", String(limit));
  return fetchAPI<ArtifactListResponse>(`/api/artifacts?${qs.toString()}`);
}

export function getArtifactContent(path: string): Promise<ArtifactContent> {
  const qs = new URLSearchParams({ path });
  return fetchAPI<ArtifactContent>(`/api/artifacts/content?${qs.toString()}`);
}

export function getSettings(): Promise<LocalSettings> {
  return fetchAPI<LocalSettings>("/api/settings");
}

export function updateSettings(payload: Omit<LocalSettings, "updated_at" | "updated_by">): Promise<LocalSettings> {
  return fetchAPI<LocalSettings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listTasks(): Promise<Task[]> {
  return fetchAPI<Task[]>("/api/tasks");
}

export function getTask(id: string): Promise<Task> {
  return fetchAPI<Task>(`/api/tasks/${id}`);
}

export function getTaskEvents(id: string): Promise<TaskEvent[]> {
  return fetchAPI<TaskEvent[]>(`/api/tasks/${id}/events`);
}

export function createTask(payload: {
  type: Task["type"];
  prompt: string;
  working_dir?: string;
  max_retries?: number;
}): Promise<Task> {
  return fetchAPI<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cancelTask(id: string): Promise<Task> {
  return fetchAPI<Task>(`/api/tasks/${id}`, { method: "DELETE" });
}

export function retryTask(id: string): Promise<Task> {
  return fetchAPI<Task>(`/api/tasks/${id}/retry`, { method: "POST" });
}

export function getTaskStats(): Promise<TaskStats> {
  return fetchAPI<TaskStats>("/api/tasks/stats");
}

export function listUsers(): Promise<User[]> {
  return fetchAPI<User[]>("/api/users");
}

export function createUser(payload: {
  email: string;
  name: string;
  role: "admin" | "member";
  password: string;
}): Promise<User> {
  return fetchAPI<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(
  id: string,
  payload: {
    name?: string;
    role?: "admin" | "member";
    is_active?: boolean;
    password?: string;
  },
): Promise<User> {
  return fetchAPI<User>(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
