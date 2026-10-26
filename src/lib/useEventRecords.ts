import { useState } from "react";
import {
  changeEventRecord,
  removeEventRecord,
  saveEventRecord,
  type EventRecord,
  type RecordCollection,
} from "./records.ts";
import type { Notify, UpdateEvent } from "./commands.ts";

type EditorState<T> =
  { mode: "closed" } | { mode: "create" } | { mode: "edit"; record: T };

/** Record dialogs have one explicit mode; rejected commands keep their form mounted. */
export function useEventRecords<K extends RecordCollection>(
  collection: K,
  onUpdate: UpdateEvent,
  notify: Notify,
) {
  const [editor, setEditor] = useState<EditorState<EventRecord<K>>>({
    mode: "closed",
  });
  const mode = editor.mode;
  function save(record: EventRecord<K>, message: string) {
    if (mode === "closed")
      return { ok: false as const, error: "Open an editor before saving." };
    const result = onUpdate((current) =>
      saveEventRecord(current, collection, record, mode),
    );
    if (result.ok) notify(message);
    return result;
  }
  function remove(id: string, message: string) {
    const result = onUpdate((current) =>
      removeEventRecord(current, collection, id),
    );
    if (result.ok) notify(message);
    return result;
  }
  function change(
    id: string,
    update: (record: EventRecord<K>) => EventRecord<K>,
  ) {
    const result = onUpdate((current) =>
      changeEventRecord(current, collection, id, update),
    );
    if (!result.ok) notify(result.error, "error");
    return result;
  }
  return {
    isOpen: mode !== "closed",
    isEditing: mode === "edit",
    initial: editor.mode === "edit" ? editor.record : undefined,
    create: () => setEditor({ mode: "create" }),
    edit: (record: EventRecord<K>) => setEditor({ mode: "edit", record }),
    close: () => setEditor({ mode: "closed" }),
    save,
    remove,
    change,
  };
}
