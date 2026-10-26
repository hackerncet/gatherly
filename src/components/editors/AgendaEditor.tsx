import type { Event } from "../../lib/types.ts";
type AgendaItem = Event["agenda"][number];
import { uid } from "../../lib/dates.ts";
import { agendaItemSchema } from "../../lib/schemas.ts";
import { RecordEditor, type RecordEditorProps } from "./RecordEditor";

export function AgendaEditor({
  initial,
  onSave,
  onClose,
}: RecordEditorProps<AgendaItem>) {
  return (
    <RecordEditor
      schema={agendaItemSchema}
      title={initial ? "Edit this moment" : "Add a moment"}
      submitLabel={"Save moment"}
      onSave={onSave}
      onClose={onClose}
      readValues={(data) => ({
        id: initial?.id ?? uid(),
        time: data.get("time"),
        title: data.get("title"),
        owner: data.get("owner"),
      })}
    >
      {(validation) => (
        <>
          <label>
            Time at the venue
            <input
              type="time"
              required
              name="time"
              {...validation.input("time")}
              defaultValue={initial?.time ?? "10:00"}
            />
          </label>
          <label>
            What is happening?
            <input
              required
              maxLength={160}
              name="title"
              {...validation.input("title")}
              defaultValue={initial?.title}
            />
          </label>
          <label>
            Responsible person or team
            <input
              maxLength={100}
              name="owner"
              {...validation.input("owner")}
              defaultValue={initial?.owner}
            />
          </label>
        </>
      )}
    </RecordEditor>
  );
}
