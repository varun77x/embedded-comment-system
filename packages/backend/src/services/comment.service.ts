import { db } from "../db/index.js";
import { redis } from "../redis/index.js";
import { sanitizeContent } from "../utils/sanitize.js";

export async function getCommentTree(threadId: string) {
  const result = await db.query(
    `SELECT
       c.id, c.parent_id, c.thread_id, c.content,
       c.upvotes, c.downvotes, c.created_at,
       u.id AS user_id, u.display_name, u.avatar_url
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.thread_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    [threadId]
  );
  return result.rows;
}

export async function createComment(
  threadId: string,
  userId: string,
  content: string,
  parentId: string | null
) {
  const clean = sanitizeContent(content);
  if (!clean) throw new Error("EMPTY_CONTENT");

  if (parentId) {
    const parent = await db.query(
      "SELECT id FROM comments WHERE id = $1 AND thread_id = $2 AND deleted_at IS NULL",
      [parentId, threadId]
    );
    if (!parent.rowCount || parent.rowCount === 0) throw new Error("INVALID_PARENT");
  }

  const result = await db.query(
    `INSERT INTO comments (thread_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, parent_id, thread_id, content, upvotes, downvotes, created_at`,
    [threadId, userId, clean, parentId]
  );

  const comment = result.rows[0];

  // Publish to Redis so all server instances broadcast via WebSocket
  await redis.publish(
    `thread:${threadId}`,
    JSON.stringify({ event: "new_comment", data: comment })
  );

  return comment;
}

export async function deleteComment(commentId: string, userId: string) {
  const result = await db.query(
    `UPDATE comments
     SET deleted_at = NOW()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [commentId, userId]
  );
  if (!result.rowCount || result.rowCount === 0) {
    throw new Error("NOT_FOUND_OR_FORBIDDEN");
  }
  return result.rows[0];
}
