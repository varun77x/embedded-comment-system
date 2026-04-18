import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";
import { commentLimiter } from "../middleware/rateLimiter.js";
import {
  getCommentTree,
  createComment,
  deleteComment,
} from "../services/comment.service.js";
import { castVote } from "../services/vote.service.js";

const router = Router();

const postCommentSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1).max(10_000),
  parentId: z.string().uuid().nullable().optional(),
});

const voteSchema = z.object({
  type: z.enum(["up", "down"]),
});

// GET /comments?threadId=<uuid>
router.get("/", async (req, res) => {
  const threadId = req.query.threadId;
  if (typeof threadId !== "string" || !threadId) {
    res.status(400).json({ error: "threadId query param is required" });
    return;
  }

  try {
    const comments = await getCommentTree(threadId);
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /comments
router.post("/", requireAuth, commentLimiter, async (req, res) => {
  const parsed = postCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId } = (req as AuthRequest).user;
  try {
    const comment = await createComment(
      parsed.data.threadId,
      userId,
      parsed.data.content,
      parsed.data.parentId ?? null
    );
    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "EMPTY_CONTENT") {
        res.status(400).json({ error: "Comment content cannot be empty after sanitization" });
        return;
      }
      if (err.message === "INVALID_PARENT") {
        res.status(400).json({ error: "Parent comment not found in this thread" });
        return;
      }
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /comments/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const { userId } = (req as AuthRequest).user;
  try {
    await deleteComment(req.params.id, userId);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") {
      res.status(404).json({ error: "Comment not found or you do not own it" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /comments/:id/vote
router.post("/:id/vote", requireAuth, async (req, res) => {
  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId } = (req as AuthRequest).user;
  try {
    const result = await castVote(req.params.id, userId, parsed.data.type);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
