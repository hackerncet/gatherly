import { RECORD_LIMITS, RECORD_NAMES } from "./limits.ts";
import type { Event } from "./types.ts";

export type RecordCollection = keyof typeof RECORD_LIMITS;
export type EventRecord<K extends RecordCollection> = Event[K][number];
export type SaveMode = "create" | "edit";

function existingIndex(records: readonly { id: string }[], id: string): number {
  const index = records.findIndex((record) => record.id === id);
  if (index < 0)
    throw new Error(
      "This entry no longer exists. Close the draft and refresh your records.",
    );
  return index;
}

/** Work only on the supplied current snapshot, retaining unrelated concurrent edits. */
export function saveEventRecord<K extends RecordCollection>(
  event: Event,
  collection: K,
  record: NoInfer<EventRecord<K>>,
  mode: SaveMode,
): Event {
  const records: readonly EventRecord<K>[] = event[collection];
  if (mode === "edit") {
    const index = existingIndex(records, record.id);
    return {
      ...event,
      [collection]: records.map((item, position) =>
        position === index ? record : item,
      ),
    };
  }
  if (records.some((item) => item.id === record.id))
    throw new Error(
      "An entry with this identifier already exists. Please try again.",
    );
  if (records.length >= RECORD_LIMITS[collection])
    throw new Error(
      `You can keep up to ${RECORD_LIMITS[collection].toLocaleString("en-US")} ${RECORD_NAMES[collection]} per event.`,
    );
  return { ...event, [collection]: [...records, record] };
}

export function changeEventRecord<K extends RecordCollection>(
  event: Event,
  collection: K,
  id: string,
  change: (record: NoInfer<EventRecord<K>>) => EventRecord<K>,
): Event {
  const records: readonly EventRecord<K>[] = event[collection];
  const index = existingIndex(records, id);
  return {
    ...event,
    [collection]: records.map((record, position) => {
      if (position !== index) return record;
      const updated = change(record);
      if (updated.id !== id)
        throw new Error("An edit cannot replace an entry's identifier.");
      return updated;
    }),
  };
}

export function removeEventRecord<K extends RecordCollection>(
  event: Event,
  collection: K,
  id: string,
): Event {
  const records: readonly EventRecord<K>[] = event[collection];
  const index = existingIndex(records, id);
  return {
    ...event,
    [collection]: records.filter((_record, position) => position !== index),
  };
}
