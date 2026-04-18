import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createSocketServer } from "./socket/index.js";
import { config } from "./config.js";
import { db } from "./db/index.js";
import { connectRedis } from "./redis/index.js";

async function main() {
  // Verify PostgreSQL connection
  await db.query("SELECT 1");
  console.log("✓ PostgreSQL connected");

  // Verify Redis connection
  await connectRedis();

  const app = createApp();
  const httpServer = createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(config.PORT, () => {
    console.log(`✓ Server running on http://localhost:${config.PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal: failed to start server:", err);
  process.exit(1);
});
