import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { resolve } from "node:path";
import { APP_VERSION } from "../src/lib/contracts.ts";
import { createPlanHandler } from "./plan.ts";
import { aiReadiness, createModelCatalog } from "./provider.ts";
interface AppOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  staticDir?: string;
  rateLimits?: boolean;
}
export function createApp({
  env = process.env,
  fetchImpl = fetch,
  staticDir = resolve("dist"),
  rateLimits = true,
}: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Render's edge is one hop away. Never trust an arbitrary forwarded-for chain.
  app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          styleSrcAttr: ["'none'"],
          frameSrc: ["'none'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: env.NODE_ENV === "development" ? null : [],
        },
      },
      referrerPolicy: { policy: "no-referrer" },
    }),
  );
  app.use((_req, res, next) => {
    res.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    next();
  });
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "20kb", strict: true }));
  const readiness = aiReadiness(env);
  const enabled = readiness.enabled;
  const models = createModelCatalog(fetchImpl);
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      aiEnabled: enabled,
      ai: readiness,
      storage: "browser-local",
      version: APP_VERSION,
    }),
  );
  app.get(
    "/api/models",
    rateLimit({
      windowMs: 60000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: () => !rateLimits,
    }),
    async (_req, res) => {
      const catalog = await models();
      res.json({ models: catalog.models, source: catalog.source });
    },
  );
  const limiter = rateLimit({
    windowMs: 3600000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => !rateLimits,
    message: {
      error:
        "You have reached the hourly planning limit. Please try again later.",
    },
  });
  app.post(
    "/api/plan",
    limiter,
    createPlanHandler({ env, fetchImpl, models, enabled }),
  );
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  const assetLimiter = rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => !rateLimits,
    message: {
      error:
        "Too many page requests. Please wait a moment before trying again.",
    },
  });
  const staticFiles = express.static(staticDir, {
    maxAge: "1h",
    setHeaders: (res, path) => {
      if (path.endsWith(".html")) res.set("Cache-Control", "no-cache");
      else if (path.includes("/assets/"))
        res.set("Cache-Control", "public, max-age=31536000, immutable");
    },
  });
  app.get("/{*path}", assetLimiter, staticFiles, (req, res, next) => {
    if (req.path.includes(".")) return res.sendStatus(404);
    res.sendFile(resolve(staticDir, "index.html"), (error) => {
      if (error) next(error);
    });
  });
  const errorHandler: ErrorRequestHandler = (
    err: unknown,
    _req,
    res,
    _next,
  ) => {
    const tooLarge =
      err instanceof Error && "type" in err && err.type === "entity.too.large";
    res.status(tooLarge ? 413 : err instanceof SyntaxError ? 400 : 500).json({
      error: tooLarge
        ? "Request is too large."
        : "Unable to process this request.",
    });
  };
  app.use(errorHandler);
  return app;
}
