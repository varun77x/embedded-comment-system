import { Router } from "express";
import { z } from "zod";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "../config.js";
import {
  registerUser,
  loginUser,
  findOrCreateGoogleUser,
} from "../services/auth.service.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { db } from "../db/index.js";

// Register Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email returned from Google"));

        const { user, token } = await findOrCreateGoogleUser({
          id: profile.id,
          email,
          displayName: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        });
        done(null, { ...user, token });
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().min(2).max(50).trim(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const router = Router();

// POST /auth/register
router.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const { user, token } = await registerUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.displayName
    );
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const { user, token } = await loginUser(parsed.data.email, parsed.data.password);
    res.json({ user, token });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/google — redirect to Google consent screen
router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"], session: false })
);

// GET /auth/google/callback — Google redirects here after consent
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/google/failure" }),
  (req, res) => {
    const { token } = req.user as { token: string };
    // Send the token back to the widget popup via postMessage, then close it.
    const safeToken = JSON.stringify(token);
    res.send(`<!DOCTYPE html>
<html><body><script>
  if (window.opener) {
    window.opener.postMessage({ type: 'UCS_AUTH', token: ${safeToken} }, '*');
  }
  window.close();
</script></body></html>`);
  }
);

// GET /auth/google/failure
router.get("/google/failure", (_req, res) => {
  res.status(401).json({ error: "Google authentication failed" });
});

// GET /auth/me — return current user profile
router.get("/me", requireAuth, async (req, res) => {
  const { userId } = (req as AuthRequest).user;
  const result = await db.query(
    "SELECT id, email, display_name, avatar_url, created_at FROM users WHERE id = $1",
    [userId]
  );
  if (!result.rowCount || result.rowCount === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(result.rows[0]);
});

export default router;
