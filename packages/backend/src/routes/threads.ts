import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";

const router = Router();

const threadQuerySchema = z.object({
  siteId: z.string().uuid(),
  url: z.string().url().max(2048),
});

// GET /threads?siteId=<uuid>&url=<page-url>
// Called by the widget on load. Gets or creates the thread for a given page.
router.get("/", async (req, res) => {
  const parsed = threadQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { siteId, url } = parsed.data;

  const site = await db.query("SELECT id FROM sites WHERE id = $1", [siteId]);
  if (!site.rowCount || site.rowCount === 0) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  const result = await db.query(
    `INSERT INTO threads (site_id, url)
     VALUES ($1, $2)
     ON CONFLICT (site_id, url) DO UPDATE SET url = EXCLUDED.url
     RETURNING id, site_id, url, created_at`,
    [siteId, url]
  );

  res.json(result.rows[0]);
});

export default router;
