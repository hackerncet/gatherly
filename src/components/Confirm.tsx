import { useState } from "react";
import { Modal } from "./Modal";
import type { CommandResult } from "../lib/commands";
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => CommandResult;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <Modal title={title} description={description} onClose={onClose}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          Keep it
        </button>
        <button
          className="button danger"
          onClick={() => {
            const result = onConfirm();
            if (result.ok) onClose();
            else setError(result.error);
          }}
        >
          Yes, delete
        </button>
      </div>
    </Modal>
  );
}
