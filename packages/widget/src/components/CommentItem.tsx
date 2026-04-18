import { h } from "preact";
import { useState } from "preact/hooks";
import type { CommentNode } from "@ucs/types";
import { castVote, deleteComment } from "../api.js";
import { commentTree } from "../store/comments.js";
import { currentUser, isLoggedIn } from "../store/auth.js";
import { CommentForm } from "./CommentForm.js";
import { timeAgo } from "../utils.js";

interface Props {
  node: CommentNode;
  threadId: string;
  depth?: number;
}

const MAX_DEPTH = 5;

export function CommentItem({ node, threadId, depth = 0 }: Props) {
  const [replying, setReplying] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);

  async function handleVote(type: "up" | "down") {
    if (!isLoggedIn.value || voteLoading) return;
    setVoteLoading(true);
    try {
      const updated = await castVote(node.id, type);
      commentTree.value = patchVotes(commentTree.value, updated.id, updated.upvotes, updated.downvotes);
    } finally {
      setVoteLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    await deleteComment(node.id);
    commentTree.value = removeNode(commentTree.value, node.id);
  }

  const isOwner = currentUser.value?.id === node.user_id;

  return (
    <div class={`comment depth-${Math.min(depth, MAX_DEPTH)}`}>
      <div class="comment-header">
        {node.avatar_url ? (
          <img class="avatar" src={node.avatar_url} alt={node.display_name} width={32} height={32} />
        ) : (
          <div class="avatar avatar-placeholder">{node.display_name[0].toUpperCase()}</div>
        )}
        <span class="display-name">{node.display_name}</span>
        <span class="timestamp">{timeAgo(node.created_at)}</span>
      </div>

      <p class="comment-content">{node.content}</p>

      <div class="comment-actions">
        <button class="vote-btn" onClick={() => handleVote("up")} disabled={voteLoading || !isLoggedIn.value} aria-label="Upvote">
          ▲ {node.upvotes}
        </button>
        <button class="vote-btn" onClick={() => handleVote("down")} disabled={voteLoading || !isLoggedIn.value} aria-label="Downvote">
          ▼ {node.downvotes}
        </button>
        {isLoggedIn.value && depth < MAX_DEPTH && (
          <button class="link-btn" onClick={() => setReplying(!replying)}>
            {replying ? "Cancel" : "Reply"}
          </button>
        )}
        {isOwner && (
          <button class="link-btn danger" onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>

      {replying && (
        <CommentForm
          threadId={threadId}
          parentId={node.id}
          onDone={() => setReplying(false)}
        />
      )}

      {node.replies.length > 0 && (
        <div class="replies">
          {node.replies.map((child) => (
            <CommentItem key={child.id} node={child} threadId={threadId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function patchVotes(
  nodes: CommentNode[],
  id: string,
  upvotes: number,
  downvotes: number
): CommentNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, upvotes, downvotes };
    if (n.replies.length) return { ...n, replies: patchVotes(n.replies, id, upvotes, downvotes) };
    return n;
  });
}

function removeNode(nodes: CommentNode[], id: string): CommentNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, replies: removeNode(n.replies, id) }));
}
