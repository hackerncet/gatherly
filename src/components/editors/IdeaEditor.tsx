import type { Idea } from "../../lib/types.ts";
import { uid } from "../../lib/dates.ts";
import { ideaSchema } from "../../lib/schemas.ts";
import { RecordEditor, type RecordEditorProps } from "./RecordEditor";

export function IdeaEditor({ onSave, onClose }: RecordEditorProps<Idea>) {
  return (
    <RecordEditor
      schema={ideaSchema}
      title={"A bright little idea."}
      submitLabel={"Save idea"}
      onSave={onSave}
      onClose={onClose}
      readValues={(data) => ({
        id: uid(),
        title: data.get("title"),
        detail: data.get("detail"),
        tag: data.get("tag"),
        saved: true,
      })}
    >
      {(validation) => (
        <div className="form-grid">
          <label className="span-2">
            Idea title
            <input
              name="title"
              {...validation.input("title")}
              required
              maxLength={160}
            />
          </label>
          <label className="span-2">
            The details
            <textarea
              name="detail"
              {...validation.input("detail")}
              required
              maxLength={600}
              rows={4}
            />
          </label>
          <label className="span-2">
            Tag
            <input
              name="tag"
              {...validation.input("tag")}
              required
              maxLength={50}
              defaultValue="Personal touch"
            />
          </label>
        </div>
      )}
    </RecordEditor>
  );
}
