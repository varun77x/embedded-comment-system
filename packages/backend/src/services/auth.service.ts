import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { signToken } from "../utils/jwt.js";

const SALT_ROUNDS = 12;

export async function registerUser(email: string, password: string, displayName: string) {
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error("EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await db.query(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name, created_at`,
    [email, passwordHash, displayName]
  );

  const user = result.rows[0];
  return { user, token: signToken({ userId: user.id, email: user.email }) };
}

export async function loginUser(email: string, password: string) {
  const result = await db.query(
    "SELECT id, email, display_name, password_hash FROM users WHERE email = $1",
    [email]
  );

  // Deliberate timing-safe path: always hash-compare even on not-found
  const dummyHash = "$2b$12$invalidsaltinvalidsaltinvalidsalt"; // prevents timing attack
  const storedHash = result.rowCount && result.rowCount > 0
    ? result.rows[0].password_hash
    : dummyHash;

  const valid = await bcrypt.compare(password, storedHash);

  if (!result.rowCount || result.rowCount === 0 || !valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const { password_hash: _pw, ...safeUser } = result.rows[0];
  return { user: safeUser, token: signToken({ userId: safeUser.id, email: safeUser.email }) };
}

export async function findOrCreateGoogleUser(profile: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}) {
  const result = await db.query(
    `INSERT INTO users (email, display_name, google_id, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET google_id   = COALESCE(users.google_id, EXCLUDED.google_id),
           avatar_url  = COALESCE(users.avatar_url, EXCLUDED.avatar_url)
     RETURNING id, email, display_name`,
    [profile.email, profile.displayName, profile.id, profile.avatarUrl ?? null]
  );

  const user = result.rows[0];
  return { user, token: signToken({ userId: user.id, email: user.email }) };
}
