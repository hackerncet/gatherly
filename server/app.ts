import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { z } from "zod";
import { briefSchema, starterPlan } from "../src/lib/domain.ts";
import {
  API,
  aiReadiness,
  createModelCatalog,
  readJson,
  completionParameters,
  readPlan,
  PlanResponseError,
  retryAfterSeconds,
  PLANNER_PROMPT,
} from "./provider.ts";
const requestSchema = z.object({
  brief: briefSchema,
  consent: z.boolean().default(false),
  model: z.string().regex(/^[a-zA-Z0-9_./:@+-]{1,160}$/),
  prompt: z.string().trim().max(1600).default(""),
});
interface AppOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  staticDir?: string;
  rateLimits?: boolean;
  devMiddleware?: RequestHandler | null;
}
export function createApp({
  env = process.env,
  fetchImpl = fetch,
  staticDir = resolve("dist"),
  rateLimits = true,
  devMiddleware = null,
}: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Render's edge is one hop away. Never trust an arbitrary forwarded-for chain.
  app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
  app.use(
    helmet({
      contentSecurityPolicy:
        env.NODE_ENV === "development"
          ? false
          : {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
                fontSrc: ["'self'"],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                frameAncestors: ["'none'"],
                formAction: ["'self'"],
              },
            },
      referrerPolicy: { policy: "no-referrer" },
    }),
  );
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
      version: "1.1.0",
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
  let inFlight = 0;
  let daily = { day: "", count: 0 };
  app.post("/api/plan", limiter, async (req, res) => {
    if (!req.is("application/json"))
      return res
        .status(415)
        .json({ error: "Use application/json for planning requests." });
    const origin = req.get("origin");
    if (
      req.get("sec-fetch-site") === "cross-site" ||
      (origin &&
        origin !== `https://${req.get("host")}` &&
        origin !== `http://${req.get("host")}`)
    )
      return res
        .status(403)
        .json({ error: "Cross-site requests are not allowed." });
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        error:
          "Please check the event details. A valid title, date, location, guest count and budget are required.",
      });
    const { brief, model, prompt } = parsed.data;
    if (!enabled)
      return res.json({
        source: "template",
        model: null,
        plan: starterPlan(brief),
        notice:
          "Starter plan created. Live AI is available after the owner configures the server key and access code.",
      });
    const provided = Buffer.from(req.get("x-ai-access-code") || "");
    const expected = Buffer.from(env.AI_ACCESS_CODE || "");
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    )
      return res.status(401).json({
        error: "Enter the private AI access code to use live generation.",
      });
    if (!parsed.data.consent)
      return res.status(403).json({
        error:
          "Agree to share your event brief with the AI provider before generating.",
      });
    const catalog = await models();
    const selectedModel = catalog.models.find((m) => m.id === model);
    if (!selectedModel)
      return res.status(400).json({
        error:
          "This model is unavailable. Refresh the model catalog and choose another.",
      });
    const day = new Date().toISOString().slice(0, 10);
    if (daily.day !== day) daily = { day, count: 0 };
    if (daily.count >= 100 || inFlight >= 3)
      return res.status(429).json({
        error:
          "The planning service is at its daily or concurrent limit. Please try again later.",
      });
    daily.count++;
    inFlight++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });
    try {
      const response = await fetchImpl(`${API}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "Gatherly Event Planner",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2200,
          ...completionParameters(selectedModel),
          messages: [
            {
              role: "system",
              content: PLANNER_PROMPT,
            },
            {
              role: "user",
              content: JSON.stringify({ event: brief, request: prompt }),
            },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429)
          return res
            .status(429)
            .set(
              "Retry-After",
              String(retryAfterSeconds(response.headers.get("retry-after"))),
            )
            .json({
              error:
                "The AI provider is busy or rate-limited. Please wait before trying again, or choose another model.",
              code: "provider_rate_limit",
            });
        return res
          .status([401, 403].includes(response.status) ? 503 : 502)
          .json({
            error: [401, 403].includes(response.status)
              ? "The AI provider rejected the server credentials. The owner should check the OpenRouter API key."
              : response.status === 402
                ? "The AI provider needs credits. Choose a free model or contact the app owner."
                : "The AI provider could not complete this request. Try another model or use the starter plan.",
          });
      }
      const completion = readPlan(
        await readJson(response, 100000),
        brief.budget,
      );
      const { plan } = completion;
      return res.json({
        source: "ai",
        model: completion.model || model,
        plan: {
          ...plan,
          vendors: plan.vendors.length
            ? plan.vendors
            : starterPlan(brief).vendors,
        },
        notice:
          "AI suggestions are estimates. Review details and confirm prices and availability directly.",
      });
    } catch (error) {
      if (error instanceof PlanResponseError)
        return res.status(502).json({ error: error.message, code: error.code });
      return res
        .status(
          error instanceof Error &&
            (error.name === "AbortError" || error.name === "TimeoutError")
            ? 504
            : 502,
        )
        .json({
          error:
            error instanceof Error &&
            (error.name === "AbortError" || error.name === "TimeoutError")
              ? "This model took too long. Try a faster model."
              : "The model returned an incomplete or invalid plan. Your existing event was not changed. Try another model.",
        });
    } finally {
      clearTimeout(timeout);
      inFlight--;
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  if (devMiddleware) app.use(devMiddleware);
  app.use(
    express.static(staticDir, {
      maxAge: "1h",
      setHeaders: (res, path) => {
        if (path.endsWith(".html")) res.set("Cache-Control", "no-cache");
        else if (path.includes("/assets/"))
          res.set("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
  app.get("/{*path}", (req, res, next) => {
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
