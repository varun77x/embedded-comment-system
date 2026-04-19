import { API_BASE } from "../config.js";

let _token: string | null = localStorage.getItem("ucs_admin_token");

export function getToken() { return _token; }

export function setToken(t: string) {
  _token = t;
  localStorage.setItem("ucs_admin_token", t);
}

export function clearToken() {
  _token = null;
  localStorage.removeItem("ucs_admin_token");
}

function authHeaders(): Record<string, string> {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const body = await res.json();
  if (!res.ok) throw new Error((body as { error: string }).error ?? "Request failed");
  return body as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  return request<{ token: string; user: import("@ucs/types").User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string, displayName: string) {
  return request<{ token: string; user: import("@ucs/types").User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function getMe() {
  return request<import("@ucs/types").User>("/auth/me");
}

// ── Sites ─────────────────────────────────────────────────────────────────────

export async function getSites() {
  return request<import("@ucs/types").Site[]>("/sites");
}

export async function createSite(name: string, allowedOrigin: string) {
  return request<import("@ucs/types").Site>("/sites", {
    method: "POST",
    body: JSON.stringify({ name, allowedOrigin }),
  });
}

// ── Comments (moderation) ─────────────────────────────────────────────────────

export async function getComments(threadId: string) {
  return request<import("@ucs/types").Comment[]>(
    `/comments?threadId=${encodeURIComponent(threadId)}`
  );
}

export async function deleteComment(commentId: string) {
  const res = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete comment");
}
