import type { Application } from "express";
import authRouter from "./auth.js";
import commentsRouter from "./comments.js";
import sitesRouter from "./sites.js";
import threadsRouter from "./threads.js";

export function registerRoutes(app: Application): void {
  app.use("/auth", authRouter);
  app.use("/comments", commentsRouter);
  app.use("/sites", sitesRouter);
  app.use("/threads", threadsRouter);
}
