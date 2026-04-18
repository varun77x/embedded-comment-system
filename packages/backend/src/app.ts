import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import passport from "passport";
import { config } from "./config.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { registerRoutes } from "./routes/index.js";

export function createApp() {
  const app = express();

  // Trust first proxy for accurate rate-limit IP detection
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmet());

  // CORS — allowlist registered origins only
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          // Allow same-origin / non-browser requests only in development
          return config.NODE_ENV === "development"
            ? callback(null, true)
            : callback(new Error("Missing origin"), false);
        }
        if (config.ALLOWED_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin not allowed: ${origin}`), false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "50kb" }));
  app.use(express.urlencoded({ extended: false, limit: "50kb" }));
  app.use(passport.initialize());
  app.use(generalLimiter);

  // Health check (bypasses rate limiter via placement order)
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  registerRoutes(app);

  // 404 catch-all
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Global error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
