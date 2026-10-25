import { z } from "zod";
import { aiPlanSchema } from "./domain.ts";

export const healthSchema = z.object({
  status: z.literal("ok"),
  aiEnabled: z.boolean(),
  ai: z
    .object({
      enabled: z.boolean(),
      keyConfigured: z.boolean(),
      accessConfigured: z.boolean(),
    })
    .optional(),
  version: z.string(),
  storage: z.string(),
});
export const catalogSchema = z.object({
  source: z.enum(["live", "cached", "fallback"]),
  models: z
    .array(
      z.object({
        id: z.string().max(160),
        name: z.string().max(300),
        free: z.boolean(),
        contextLength: z.number().nonnegative(),
        inputPrice: z.string().max(100),
        outputPrice: z.string().max(100),
        supportsJson: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(5000),
});
export const planResponseSchema = z.object({
  source: z.enum(["ai", "template"]),
  model: z.string().nullable(),
  plan: aiPlanSchema,
});
export async function apiJson<T>(
  url: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(55000)])
      : AbortSignal.timeout(15000),
  });
  const raw: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string().max(1000) }).safeParse(raw);
    throw new Error(
      error.success
        ? error.data.error
        : "The planning service could not complete this request.",
    );
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      "The service returned an unexpected response. Please refresh and try again.",
    );
  return parsed.data;
}
