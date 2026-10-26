import type { Budget, Currency } from "../../lib/types.ts";
import { uid } from "../../lib/dates.ts";
import { budgetSchema } from "../../lib/schemas.ts";
import { RecordEditor, type RecordEditorProps } from "./RecordEditor";

export function BudgetEditor({
  initial,
  onSave,
  onClose,
  currency,
}: RecordEditorProps<Budget> & { currency: Currency }) {
  return (
    <RecordEditor
      schema={budgetSchema}
      title={initial ? "Edit budget category" : "A place for every penny"}
      submitLabel={"Save category"}
      onSave={onSave}
      onClose={onClose}
      readValues={(data) => ({
        id: initial?.id ?? uid(),
        category: data.get("category"),
        planned: Number(data.get("planned")),
        paid: Number(data.get("paid")),
      })}
    >
      {(validation) => (
        <div className="form-grid">
          <label className="span-2">
            Category
            <input
              name="category"
              {...validation.input("category")}
              required
              maxLength={80}
              defaultValue={initial?.category || ""}
            />
          </label>
          <label>
            Planned ({currency})
            <input
              name="planned"
              {...validation.input("planned")}
              type="number"
              min="0"
              max="1000000000"
              step="1"
              required
              defaultValue={initial?.planned || 0}
            />
          </label>
          <label>
            Paid ({currency})
            <input
              name="paid"
              {...validation.input("paid")}
              type="number"
              min="0"
              max="1000000000"
              step="1"
              required
              defaultValue={initial?.paid || 0}
            />
          </label>
        </div>
      )}
    </RecordEditor>
  );
}
