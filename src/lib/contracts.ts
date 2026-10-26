import { z } from "zod";
import { aiPlanSchema, briefSchema } from "./schemas.ts";
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
        supportsSchema: z.boolean().optional(),
        reasoningMode: z.enum(["off", "low"]).optional(),
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
export const planRequestSchema = z.object({
  brief: briefSchema,
  consent: z.boolean().default(false),
  model: z.string().trim().min(1).max(160),
  prompt: z.string().trim().max(1600).default(""),
});
export const APP_VERSION = "1.2.0";
