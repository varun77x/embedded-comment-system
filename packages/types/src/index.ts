// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string; // ISO-8601
}

// ─── Site ────────────────────────────────────────────────────────────────────

export interface Site {
  id: string;
  owner_id: string;
  name: string;
  allowed_origin: string;
  api_key: string;
  created_at: string;
}

// ─── Thread ──────────────────────────────────────────────────────────────────

export interface Thread {
  id: string;
  site_id: string;
  url: string;
  created_at: string;
}

// ─── Comment ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  thread_id: string;
  parent_id: string | null;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

/**
 * A Comment with its replies resolved into a tree.
 * Built on the client side from the flat Comment[] returned by the API.
 */
export interface CommentNode extends Comment {
  replies: CommentNode[];
}

// ─── API request / response bodies ───────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, "email">;
  token: string;
}

export interface PostCommentRequest {
  threadId: string;
  content: string;
  parentId?: string | null;
}

export interface VoteRequest {
  type: "up" | "down";
}

export interface ApiError {
  error: string | Record<string, unknown>;
}

// ─── WebSocket (Socket.io) events ─────────────────────────────────────────────

export type ThreadUpdatePayload =
  | { event: "new_comment"; data: Comment }
  | { event: "vote_update"; data: Pick<Comment, "id" | "upvotes" | "downvotes"> };

// ─── Widget initialisation config (passed by the host site) ──────────────────

export interface WidgetConfig {
  /** The site ID issued after registering your site in the admin dashboard. */
  siteId: string;
  /** The DOM element ID where the widget iframe will be injected. */
  containerId?: string;
  /** Override the URL used as the thread key. Defaults to window.location.href. */
  pageUrl?: string;
}
