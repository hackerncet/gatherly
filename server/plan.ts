import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { planRequestSchema } from "../src/lib/contracts.ts";
import { starterPlan } from "../src/lib/templates.ts";
import {
  API,
  createModelCatalog,
  readJson,
  completionParameters,
  readPlan,
  PlanResponseError,
  retryAfterSeconds,
  PLANNER_PROMPT,
} from "./provider.ts";

function hasAccessCode(
  provided: string | undefined,
  expected: string | undefined,
) {
  const actualBytes = Buffer.from(provided ?? "");
  const expectedBytes = Buffer.from(expected ?? "");
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}
async function providerFailure(response: globalThis.Response, res: Response) {
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
  const authentication = [401, 403].includes(response.status);
  return res.status(authentication ? 503 : 502).json({
    error: authentication
      ? "The AI provider rejected the server credentials. The owner should check the OpenRouter API key."
      : response.status === 402
        ? "The AI provider needs credits. Choose a free model or contact the app owner."
        : "The AI provider could not complete this request. Try another model or use the starter plan.",
  });
}
function generationFailure(error: unknown, res: Response) {
  if (error instanceof PlanResponseError)
    return res.status(502).json({ error: error.message, code: error.code });
  const timeout =
    error instanceof Error &&
    ["AbortError", "TimeoutError"].includes(error.name);
  return res.status(timeout ? 504 : 502).json({
    error: timeout
      ? "This model took too long. Try a faster model."
      : "The model returned an incomplete or invalid plan. Your existing event was not changed. Try another model.",
  });
}
export function createPlanHandler({
  env,
  fetchImpl,
  models,
  enabled,
}: {
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  models: ReturnType<typeof createModelCatalog>;
  enabled: boolean;
}) {
  let inFlight = 0;
  let daily = { day: "", count: 0 };
  return async (req: Request, res: Response) => {
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
    const parsed = planRequestSchema.safeParse(req.body);
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
    if (!hasAccessCode(req.get("x-ai-access-code"), env.AI_ACCESS_CODE))
      return res.status(401).json({
        error: "Enter the private AI access code to use live generation.",
      });
    if (!parsed.data.consent)
      return res.status(403).json({
        error:
          "Agree to share your event brief with the AI provider before generating.",
      });
    const catalog = await models();
    if (res.destroyed) return;
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
      if (!response.ok) return await providerFailure(response, res);
      const completion = readPlan(
        await readJson(response, 100000),
        brief.budget,
      );
      const { plan } = completion;
      return res.json({
        source: "ai",
        model: completion.model || model,
        plan,
        notice:
          "AI category priorities are allocated to your exact total with a 10% contingency reserve. Review estimates, prices and availability directly.",
      });
    } catch (error) {
      return generationFailure(error, res);
    } finally {
      clearTimeout(timeout);
      inFlight--;
    }
  };
}
