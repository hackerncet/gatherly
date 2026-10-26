import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const desc = useId();
  useEffect(() => {
    const dialog = ref.current;
    const activeElement = document.activeElement;
    const originalOpener =
      activeElement instanceof HTMLElement ? activeElement : null;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLElement>(
        'input:not([type="checkbox"]), textarea, select',
      )
      ?.focus();
    return () => {
      dialog?.close();
      const target = originalOpener?.isConnected
        ? originalOpener
        : document.querySelector<HTMLElement>(".new-event");
      target?.focus();
    };
  }, []);
  return (
    // Native dialog keyboard trapping and backdrop clicks belong to the dialog itself.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={id}
      aria-describedby={description ? desc : undefined}
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const targets = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
          ),
        ].filter((target) => target.getClientRects().length > 0);
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (!first || !last) {
          event.preventDefault();
          event.currentTarget.focus();
          return;
        }
        const current = event.currentTarget.ownerDocument.activeElement;
        if (
          event.shiftKey &&
          (current === first || current === event.currentTarget)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && current === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const box = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < box.left ||
          e.clientX > box.right ||
          e.clientY < box.top ||
          e.clientY > box.bottom
        )
          onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p id={desc}>{description}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
