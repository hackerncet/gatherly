import type { FormEvent, ReactNode } from "react";
import type { z } from "zod";
import { Modal } from "../Modal";
import { useFormValidation } from "../../lib/useFormValidation";
import type { CommandResult } from "../../lib/commands";

export interface RecordEditorProps<T> {
  initial: T | undefined;
  onSave: (record: T) => CommandResult;
  onClose: () => void;
}

interface Props<T> {
  schema: z.ZodType<T>;
  title: string;
  description?: string;
  submitLabel: string;
  readValues: (form: FormData) => unknown;
  onSave: (record: T) => CommandResult;
  onClose: () => void;
  children: (validation: ReturnType<typeof useFormValidation>) => ReactNode;
}

/** A draft closes only after schema validation and an explicitly accepted command. */
export function RecordEditor<T>({
  schema,
  title,
  description,
  submitLabel,
  readValues,
  onSave,
  onClose,
  children,
}: Props<T>) {
  const validation = useFormValidation();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const record = validation.parse(
      schema,
      readValues(new FormData(event.currentTarget)),
      event.currentTarget,
    );
    if (record === null) return;
    const result = onSave(record);
    if (result.ok) onClose();
    else validation.fail(result.error);
  }
  return (
    <Modal
      title={title}
      {...(description === undefined ? {} : { description })}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {children(validation)}
        {validation.error && (
          <p className="form-error" id={validation.errorId} role="alert">
            {validation.error}
          </p>
        )}
        <div className="modal-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
