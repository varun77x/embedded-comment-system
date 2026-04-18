import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";
import { db } from "../db/index.js";
import { randomBytes } from "node:crypto";

const router = Router();

const siteSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  allowedOrigin: z.string().url().max(2048),
});

// POST /sites — register a new site
router.post("/", requireAuth, async (req, res) => {
  const parsed = siteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId } = (req as AuthRequest).user;
  const apiKey = randomBytes(32).toString("hex");

  try {
    const result = await db.query(
      `INSERT INTO sites (owner_id, name, allowed_origin, api_key)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, allowed_origin, api_key, created_at`,
      [userId, parsed.data.name, parsed.data.allowedOrigin, apiKey]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /sites — list all sites owned by the authenticated user
router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as AuthRequest).user;
  const result = await db.query(
    `SELECT id, name, allowed_origin, api_key, created_at
     FROM sites
     WHERE owner_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  res.json(result.rows);
});

export default router;
