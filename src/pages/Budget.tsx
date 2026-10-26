import { useFormValidation } from "../lib/useFormValidation";
import { useState, type FormEvent } from "react";
import {
  Download,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  CircleAlert,
} from "lucide-react";
import { Confirm, Empty, Modal, PageHeading } from "../components/ui";
import { budgetSchema, escapeCsv, totals, uid } from "../lib/domain.ts";
import { downloadFile, money } from "../lib/storage";
import type { Budget, Event } from "../lib/types";
export function BudgetPage({
  event,
  onUpdate,
  notify,
}: {
  event: Event;
  onUpdate: (e: Event) => void;
  notify: (s: string) => void;
}) {
  const [editing, setEditing] = useState<Budget | null | false>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const validation = useFormValidation();
  const { error, errorId } = validation;
  const t = totals(event);
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = validation.parse(
      budgetSchema,
      {
        id: editing ? editing.id : uid(),
        category: f.get("category"),
        planned: Number(f.get("planned")),
        paid: Number(f.get("paid")),
      },
      e.currentTarget,
    );
    if (!parsed) return;
    if (!editing && event.budgets.length >= 100) {
      validation.fail("You can add up to 100 budget categories.");
      return;
    }
    onUpdate({
      ...event,
      budgets: editing
        ? event.budgets.map((b) => (b.id === editing.id ? parsed : b))
        : [...event.budgets, parsed],
    });
    setEditing(false);
    notify("Budget updated.");
  }
  function exportCsv() {
    const rows = [
      ["Category", "Planned", "Paid", "Remaining", "Currency"],
      ...event.budgets.map((b) => [
        b.category,
        b.planned,
        b.paid,
        b.planned - b.paid,
        event.currency,
      ]),
    ];
    downloadFile(
      "gatherly-budget.csv",
      rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n"),
      "text/csv;charset=utf-8",
    );
    notify("Budget exported.");
  }
  return (
    <>
      <PageHeading
        eyebrow="THE NUMBERS, NICELY SORTED"
        title="More moments. Less money stress."
        description="A clear view of your budget, from the first quote to the final payment."
        action={
          <div className="button-group">
            <button className="button secondary" onClick={exportCsv}>
              <Download size={16} />
              Export
            </button>
            <button
              className="button primary"
              onClick={() => {
                setEditing(null);
                validation.clear();
              }}
            >
              <Plus size={17} />
              Add category
            </button>
          </div>
        }
      />
      <div className="budget-stats">
        <div className="panel">
          <span>Total event budget</span>
          <strong>{money(event.budget, event.currency)}</strong>
          <small>Set in event details</small>
        </div>
        <div className="panel">
          <span>Planned spending</span>
          <strong>{money(t.allocated, event.currency)}</strong>
          <small>
            {t.unallocated < 0
              ? `${money(-t.unallocated, event.currency)} over allocation`
              : `${money(t.unallocated, event.currency)} unallocated`}
          </small>
        </div>
        <div className="panel">
          <span>Already paid</span>
          <strong>{money(t.paid, event.currency)}</strong>
          <small>Payments recorded by you</small>
        </div>
        <div className="panel highlight-stat">
          <span>Still in your pocket</span>
          <strong>{money(t.remaining, event.currency)}</strong>
          <small>Budget minus paid amounts</small>
        </div>
      </div>
      {(t.unallocated < 0 || t.remaining < 0) && (
        <div className="notice warning">
          <CircleAlert size={20} />
          <span>
            Your{" "}
            {t.remaining < 0 ? "payments exceed" : "planned spending exceeds"}{" "}
            the event budget. Review categories or update your total budget in
            Settings.
          </span>
        </div>
      )}
      <section className="panel table-panel">
        <div className="section-title">
          <h2>Every detail accounted for</h2>
          <span className="muted">{event.budgets.length} categories</span>
        </div>
        {event.budgets.length ? (
          <div
            className="table-scroll"
            role="region"
            aria-label="Scrollable budget table"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">
                Event budget categories and recorded payments
              </caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Planned</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Payment progress</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {event.budgets.map((b, i) => (
                  <tr key={b.id}>
                    <th scope="row">
                      <span className={`category-marker color-${i % 7}`} />
                      {b.category}
                    </th>
                    <td>{money(b.planned, event.currency)}</td>
                    <td>{money(b.paid, event.currency)}</td>
                    <td className={b.paid > b.planned ? "negative" : ""}>
                      {money(b.planned - b.paid, event.currency)}
                    </td>
                    <td>
                      <div className="table-progress">
                        <span
                          style={{
                            width: `${Math.min(100, b.planned ? (b.paid / b.planned) * 100 : b.paid ? 100 : 0)}%`,
                          }}
                        />
                      </div>
                      <small className="muted">
                        {b.paid === 0
                          ? "Not started"
                          : b.paid >= b.planned
                            ? "Fully paid"
                            : "Partially paid"}
                      </small>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${b.category}`}
                          onClick={() => {
                            setEditing(b);
                            validation.clear();
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${b.category}`}
                          onClick={() => setDeleting(b.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td>{money(t.allocated, event.currency)}</td>
                  <td>{money(t.paid, event.currency)}</td>
                  <td>{money(t.allocated - t.paid, event.currency)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <Empty
            icon={<Wallet />}
            title="Give your budget a little structure"
            description="Add your first category, such as venue, catering or decorations."
          />
        )}
      </section>
      <div className="notice">
        <Wallet size={19} />
        <p>
          Keep a little breathing room. A <strong>10% contingency</strong> is
          included in starter budgets for those unexpected extras. All amounts
          are planning estimates until you confirm real quotes.
        </p>
      </div>
      {editing !== false && (
        <Modal
          title={editing ? "Edit budget category" : "A place for every penny"}
          onClose={() => setEditing(false)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="span-2">
                Category
                <input
                  name="category"
                  {...validation.input("category")}
                  required
                  maxLength={80}

                  defaultValue={editing?.category || ""}
                />
              </label>
              <label>
                Planned ({event.currency})
                <input
                  name="planned"
                  {...validation.input("planned")}
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  required
                  defaultValue={editing?.planned || 0}
                />
              </label>
              <label>
                Paid ({event.currency})
                <input
                  name="paid"
                  {...validation.input("paid")}
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  required
                  defaultValue={editing?.paid || 0}
                />
              </label>
            </div>
            {error && (
              <p role="alert" id={errorId} className="form-error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button className="button primary">Save category</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Remove this category?"
          description="Its planned amount and payment record will be deleted. Your total event budget will stay the same."
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onUpdate({
              ...event,
              budgets: event.budgets.filter((b) => b.id !== deleting),
            });
            notify("Category removed.");
          }}
        />
      )}
    </>
  );
}
