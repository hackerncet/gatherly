import {
  eventSchema,
  workspaceSchema,
  type Event,
  type Workspace,
} from "./schemas.ts";
import { MAX_EVENTS } from "./limits.ts";
import type { EventChange } from "./commands.ts";

/** A valid workspace always contains an event; fail explicitly if an invariant breaks. */
export function activeEvent(workspace: Workspace): Event {
  const event =
    workspace.events.find((entry) => entry.id === workspace.activeId) ??
    workspace.events[0];
  if (!event)
    throw new Error("The workspace has no events. Restore a valid backup.");
  return event;
}

export function updateWorkspaceEvent(
  workspace: Workspace,
  input: Event,
): Workspace {
  const event = eventSchema.parse(input);
  if (!workspace.events.some((entry) => entry.id === event.id))
    throw new Error(
      "This event is no longer in the workspace. Your change was not applied.",
    );
  return {
    ...workspace,
    events: workspace.events.map((entry) =>
      entry.id === event.id ? event : entry,
    ),
  };
}

export function appendWorkspaceEvent(
  workspace: Workspace,
  event: Event,
): Workspace {
  if (workspace.events.length >= MAX_EVENTS)
    throw new Error(
      "You can keep up to 30 events. Export and remove an old event first.",
    );
  return workspaceSchema.parse({
    ...workspace,
    events: [...workspace.events, event],
    activeId: event.id,
  });
}

/** Bind a command to its event ID and apply it to the latest workspace snapshot. */
export function changeWorkspaceEvent(
  workspace: Workspace,
  id: string,
  change: EventChange,
): Workspace {
  const current = workspace.events.find((event) => event.id === id);
  if (!current)
    throw new Error(
      "This event is no longer in the workspace. Your change was not applied.",
    );
  const next = change(current);
  if (next.id !== id)
    throw new Error("An edit cannot replace an event's identifier.");
  return updateWorkspaceEvent(workspace, next);
}

export function removeWorkspaceEvent(
  workspace: Workspace,
  id: string,
): Workspace {
  const events = workspace.events.filter((event) => event.id !== id);
  const first = events[0];
  if (!first)
    throw new Error("Create another event before deleting your last one.");
  return {
    ...workspace,
    events,
    activeId: events.some((event) => event.id === workspace.activeId)
      ? workspace.activeId
      : first.id,
  };
}
