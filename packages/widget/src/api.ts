import { API_BASE } from "../config.js";
import type {
  Comment,
  Thread,
  AuthResponse,
  PostCommentRequest,
  VoteRequest,
} from "@ucs/types";
import { token } from "../store/auth.js";

function authHeaders(): Record<string, string> {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {};
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
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error: string }).error ?? "Request failed");
  return body as T;
}

export async function getOrCreateThread(siteId: string, pageUrl: string): Promise<Thread> {
  return request<Thread>(
    `/threads?siteId=${encodeURIComponent(siteId)}&url=${encodeURIComponent(pageUrl)}`
  );
}

export async function fetchComments(threadId: string): Promise<Comment[]> {
  return request<Comment[]>(`/comments?threadId=${encodeURIComponent(threadId)}`);
}

export async function postComment(body: PostCommentRequest): Promise<Comment> {
  return request<Comment>("/comments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteComment(commentId: string): Promise<void> {
  await request(`/comments/${commentId}`, { method: "DELETE" });
}

export async function castVote(commentId: string, type: VoteRequest["type"]): Promise<Comment> {
  return request<Comment>(`/comments/${commentId}/vote`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });
}

export function openGoogleOAuth(apiBase: string = API_BASE) {
  const popup = window.open(
    `${apiBase}/auth/google`,
    "ucs_oauth",
    "width=500,height=600,menubar=no,toolbar=no"
  );
  return popup;
}
