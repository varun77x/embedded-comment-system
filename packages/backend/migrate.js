/**
 * Minimal migration runner.
 * Usage: node --import=./register.js migrate.js
 * Or via package.json script: pnpm migrate
 *
 * Applies every *.sql file in ./migrations/ in lexicographic order,
 * skipping files already recorded in schema_migrations.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations"
    );
    const applied = new Set(rows.map((r) => r.version));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let ran = 0;
    for (const file of files) {
      const version = file.replace(".sql", "");
      if (applied.has(version)) {
        console.log(`  skip  ${file}`);
        continue;
      }

      console.log(`  apply ${file} …`);
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [version]
        );
        await client.query("COMMIT");
        console.log(`  ✓     ${file}`);
        ran++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    if (ran === 0) console.log("  Nothing to migrate.");
    else console.log(`\nApplied ${ran} migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
