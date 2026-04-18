import { db } from "../db/index.js";
import { redis } from "../redis/index.js";

export type VoteType = "up" | "down";

export async function castVote(commentId: string, userId: string, vote: VoteType) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT vote_type FROM votes WHERE comment_id = $1 AND user_id = $2",
      [commentId, userId]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const prev = existing.rows[0].vote_type as VoteType;
      if (prev === vote) {
        // Same vote again → toggle off
        await client.query(
          "DELETE FROM votes WHERE comment_id = $1 AND user_id = $2",
          [commentId, userId]
        );
        const col = vote === "up" ? "upvotes" : "downvotes";
        await client.query(
          `UPDATE comments SET ${col} = GREATEST(0, ${col} - 1) WHERE id = $1`,
          [commentId]
        );
      } else {
        // Switching vote direction
        await client.query(
          "UPDATE votes SET vote_type = $1 WHERE comment_id = $2 AND user_id = $3",
          [vote, commentId, userId]
        );
        const dec = prev === "up" ? "upvotes" : "downvotes";
        const inc = vote === "up" ? "upvotes" : "downvotes";
        await client.query(
          `UPDATE comments SET ${dec} = GREATEST(0, ${dec} - 1), ${inc} = ${inc} + 1 WHERE id = $1`,
          [commentId]
        );
      }
    } else {
      // New vote
      await client.query(
        "INSERT INTO votes (comment_id, user_id, vote_type) VALUES ($1, $2, $3)",
        [commentId, userId, vote]
      );
      const col = vote === "up" ? "upvotes" : "downvotes";
      await client.query(
        `UPDATE comments SET ${col} = ${col} + 1 WHERE id = $1`,
        [commentId]
      );
    }

    const updated = await client.query(
      "SELECT id, upvotes, downvotes, thread_id FROM comments WHERE id = $1",
      [commentId]
    );

    await client.query("COMMIT");

    const comment = updated.rows[0];

    // Broadcast vote change in real-time
    await redis.publish(
      `thread:${comment.thread_id}`,
      JSON.stringify({
        event: "vote_update",
        data: { id: comment.id, upvotes: comment.upvotes, downvotes: comment.downvotes },
      })
    );

    return comment;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
