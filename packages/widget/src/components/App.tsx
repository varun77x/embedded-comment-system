import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { commentTree, isLoading, error } from "../store/comments.js";
import { currentUser, isLoggedIn, clearToken, token } from "../store/auth.js";
import { getOrCreateThread, fetchComments } from "../api.js";
import { buildCommentTree } from "../utils.js";
import { useSocket } from "../hooks/useSocket.js";
import { CommentItem } from "./CommentItem.js";
import { CommentForm } from "./CommentForm.js";
import { AuthForm } from "./AuthForm.js";
import { API_BASE } from "../config.js";

interface Props {
  siteId: string;
  pageUrl: string;
}

export function App({ siteId, pageUrl }: Props) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useSocket(threadId);

  // Load current user on token change
  useEffect(() => {
    if (!token.value) { currentUser.value = null; return; }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
      .then((r) => r.json())
      .then((u) => { currentUser.value = u; })
      .catch(() => clearToken());
  }, [token.value]);

  // Load thread + comments
  useEffect(() => {
    isLoading.value = true;
    error.value = null;

    getOrCreateThread(siteId, pageUrl)
      .then((thread) => {
        setThreadId(thread.id);
        return fetchComments(thread.id);
      })
      .then((flat) => {
        commentTree.value = buildCommentTree(flat);
      })
      .catch((e) => {
        error.value = e instanceof Error ? e.message : "Failed to load comments";
      })
      .finally(() => {
        isLoading.value = false;
      });
  }, [siteId, pageUrl]);

  const count = countAll(commentTree.value);

  return (
    <div class="ucs-widget">
      <div class="widget-header">
        <h2>{count} Comment{count !== 1 ? "s" : ""}</h2>
        {isLoggedIn.value ? (
          <div class="user-bar">
            <span>{currentUser.value?.display_name}</span>
            <button class="link-btn" onClick={clearToken}>Sign out</button>
          </div>
        ) : (
          <button class="btn btn-primary" onClick={() => setShowAuth(!showAuth)}>
            {showAuth ? "Cancel" : "Sign in to comment"}
          </button>
        )}
      </div>

      {showAuth && !isLoggedIn.value && <AuthForm />}

      {isLoading.value && <p class="status">Loading comments…</p>}
      {error.value && <p class="status error">{error.value}</p>}

      {isLoggedIn.value && threadId && (
        <CommentForm threadId={threadId} />
      )}

      <div class="comment-list">
        {commentTree.value.map((node) => (
          <CommentItem key={node.id} node={node} threadId={threadId!} />
        ))}
        {!isLoading.value && commentTree.value.length === 0 && (
          <p class="status">No comments yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}

function countAll(nodes: import("@ucs/types").CommentNode[]): number {
  let n = nodes.length;
  for (const node of nodes) n += countAll(node.replies);
  return n;
}
