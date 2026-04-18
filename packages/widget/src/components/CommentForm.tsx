import { h } from "preact";
import { useState } from "preact/hooks";
import { postComment } from "../api.js";
import { commentTree } from "../store/comments.js";
import { buildCommentTree } from "../utils.js";
import type { Comment } from "@ucs/types";

interface Props {
  threadId: string;
  parentId?: string | null;
  onDone?: () => void;
}

export function CommentForm({ threadId, parentId = null, onDone }: Props) {
  const [content, setContent] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!content.trim()) return;
    setErr(null);
    setLoading(true);
    try {
      const newComment = await postComment({ threadId, content, parentId });
      // Optimistically add to tree (WebSocket will also fire, deduplicated by id)
      const flat = flattenTree(commentTree.value);
      if (!flat.find((c) => c.id === newComment.id)) {
        flat.push(newComment);
        commentTree.value = buildCommentTree(flat);
      }
      setContent("");
      onDone?.();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form class="comment-form" onSubmit={handleSubmit}>
      <textarea
        placeholder={parentId ? "Write a reply…" : "Write a comment…"}
        value={content}
        onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
        rows={3}
        maxLength={10000}
        required
      />
      {err && <p class="error">{err}</p>}
      <div class="form-actions">
        {onDone && (
          <button type="button" class="btn btn-ghost" onClick={onDone}>
            Cancel
          </button>
        )}
        <button type="submit" class="btn btn-primary" disabled={loading || !content.trim()}>
          {loading ? "Posting…" : parentId ? "Reply" : "Post"}
        </button>
      </div>
    </form>
  );
}

function flattenTree(nodes: import("@ucs/types").CommentNode[]): Comment[] {
  const result: Comment[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop()!;
    const { replies, ...comment } = node;
    result.push(comment as Comment);
    stack.push(...replies);
  }
  return result;
}
