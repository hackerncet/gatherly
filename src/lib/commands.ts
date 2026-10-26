import type { Event } from "./types";

/** Acceptance updates the in-memory workspace; device persistence has its own status.
 * A rejected command must keep its draft open and cannot announce success.
 */
export type CommandFailure = { readonly ok: false; readonly error: string };
export type CommandResult = { readonly ok: true } | CommandFailure;

export const COMMAND_OK: CommandResult = Object.freeze({ ok: true });
export type EventChange = (current: Event) => Event;
export type UpdateEvent = (change: EventChange) => CommandResult;
export type Notify = (message: string, tone?: "success" | "error") => void;
export interface EventPageProps {
  event: Event;
  onUpdate: UpdateEvent;
  notify: Notify;
}

export function commandFailure(
  error: unknown,
  fallback: string,
): CommandFailure {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}
