import { z } from "zod";
export {
  healthSchema,
  catalogSchema,
  planResponseSchema,
} from "./contracts.ts";

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
  let raw: unknown;
  try {
    raw = await response.json();
  } catch (failure) {
    if (
      failure instanceof Error &&
      ["AbortError", "TimeoutError"].includes(failure.name)
    )
      throw failure;
    throw new Error(
      "The planning service returned an unreadable response. Please retry the connection.",
    );
  }
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
