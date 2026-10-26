import type { Task } from "../../lib/types.ts";
import { today, uid } from "../../lib/dates.ts";
import { taskSchema } from "../../lib/schemas.ts";
import { RecordEditor, type RecordEditorProps } from "./RecordEditor";

export function TaskEditor({
  initial,
  onSave,
  onClose,
}: RecordEditorProps<Task>) {
  return (
    <RecordEditor
      schema={taskSchema}
      title={initial ? "A little change of plan." : "One little step."}
      description="Give it a name and a date. We’ll keep it right here."
      submitLabel={initial ? "Save task" : "Add task"}
      onSave={onSave}
      onClose={onClose}
      readValues={(data) => ({
        id: initial?.id ?? uid(),
        title: data.get("title"),
        date: data.get("date"),
        category: data.get("category"),
        done: initial?.done ?? false,
      })}
    >
      {(validation) => (
        <div className="form-grid">
          <label className="span-2">
            Task name
            <input
              name="title"
              {...validation.input("title")}
              required
              maxLength={180}
              placeholder="e.g. Confirm the cake delivery"
              defaultValue={initial?.title}
            />
          </label>
          <label>
            Due date
            <input
              name="date"
              {...validation.input("date")}
              type="date"
              required
              defaultValue={initial?.date || today()}
            />
          </label>
          <label>
            Category
            <input
              name="category"
              {...validation.input("category")}
              required
              maxLength={60}
              defaultValue={initial?.category || "Planning"}
              list="task-categories"
            />
            <datalist id="task-categories">
              {[
                "Planning",
                "Venue",
                "Guests",
                "Catering",
                "Decor",
                "Vendors",
                "Safety",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </datalist>
          </label>
        </div>
      )}
    </RecordEditor>
  );
}
