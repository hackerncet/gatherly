import { useId, useState } from "react";
import type { z } from "zod";

/** Keep schema errors associated with the field that needs the user's attention. */
export function useFormValidation() {
  const errorId = useId();
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  function fail(message: string) {
    setField("");
    setError(message);
  }
  function clear() {
    setField("");
    setError("");
  }
  function parse<T>(
    schema: z.ZodType<T>,
    value: unknown,
    form: HTMLFormElement,
  ): T | null {
    const result = schema.safeParse(value);
    if (result.success) {
      clear();
      return result.data;
    }
    const issue = result.error.issues[0];
    const name = String(issue?.path[0] ?? "");
    const control = form.elements.namedItem(name);
    const label =
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
        ? control.labels?.[0]?.textContent?.trim()
        : name;
    setField(name);
    const detail =
      issue?.code === "too_small" &&
      issue.origin === "string" &&
      issue.minimum === 1
        ? "This field cannot be blank."
        : (issue?.message ?? "A valid value is required.");
    setError(`Please check ${label || "your details"}: ${detail}`);
    if (control instanceof HTMLElement) control.focus();
    return null;
  }
  function input(name: string) {
    return {
      "aria-invalid": field === name || undefined,
      "aria-describedby": field === name ? errorId : undefined,
    };
  }
  return { error, errorId, fail, clear, parse, input };
}
