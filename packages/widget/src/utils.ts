import type { Comment, CommentNode } from "@ucs/types";

/**
 * Converts a flat array of Comments (from the API) into a nested tree.
 * Uses a DFS-friendly map approach: O(n).
 */
export function buildCommentTree(flat: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of flat) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const node of map.values()) {
    if (node.parent_id) {
      const parent = map.get(node.parent_id);
      if (parent) {
        parent.replies.push(node);
      } else {
        roots.push(node); // orphan safety
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
