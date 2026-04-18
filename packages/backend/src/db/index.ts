import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

export const db = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

db.on("error", (err) => {
  console.error("Unexpected PostgreSQL client error:", err);
  process.exit(1);
});
