import { useEffect } from "preact/hooks";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "../config.js";
import type { ThreadUpdatePayload, Comment } from "@ucs/types";
import { commentTree } from "../store/comments.js";
import { buildCommentTree } from "../utils.js";

let socket: Socket | null = null;

export function useSocket(threadId: string | null) {
  useEffect(() => {
    if (!threadId) return;

    socket = io(API_BASE, { transports: ["websocket"] });

    socket.emit("join_thread", threadId);

    socket.on("thread_update", (payload: ThreadUpdatePayload) => {
      if (payload.event === "new_comment") {
        // Append the new comment to the flat list then rebuild tree
        const allComments = flattenTree(commentTree.value);
        allComments.push(payload.data as Comment);
        commentTree.value = buildCommentTree(allComments);
      } else if (payload.event === "vote_update") {
        // Patch vote counts in-place
        commentTree.value = patchVotes(
          commentTree.value,
          payload.data.id,
          payload.data.upvotes,
          payload.data.downvotes
        );
      }
    });

    return () => {
      socket?.emit("leave_thread", threadId);
      socket?.disconnect();
      socket = null;
    };
  }, [threadId]);
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

function patchVotes(
  nodes: import("@ucs/types").CommentNode[],
  id: string,
  upvotes: number,
  downvotes: number
): import("@ucs/types").CommentNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, upvotes, downvotes };
    if (n.replies.length) return { ...n, replies: patchVotes(n.replies, id, upvotes, downvotes) };
    return n;
  });
}
