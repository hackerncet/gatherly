import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Download,
  FileJson,
  LockKeyhole,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { PageHeading } from "../components/ui";
import { downloadFile, parseBackup } from "../lib/storage";
import type { Event, Workspace } from "../lib/types";
export function SettingsPage({
  workspace,
  event,
  onImport,
  onDelete,
  onEdit,
  notify,
}: {
  workspace: Workspace;
  event: Event;
  onImport: (w: Workspace) => Promise<boolean>;
  onDelete: () => void;
  onEdit: () => void;
  notify: (s: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const readSequence = useRef(0);
  useEffect(
    () => () => {
      readSequence.current++;
    },
    [],
  );
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const sequence = ++readSequence.current;
    setError("");
    setIncoming(null);
    const file = input.files?.[0];
    if (!file) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      if (file.size > 25_000_000)
        throw new Error("Please choose a backup smaller than 25 MB.");
      const parsed = parseBackup(await file.text());
      if (sequence === readSequence.current) setIncoming(parsed);
    } catch {
      if (sequence !== readSequence.current) return;
      setError(
        "This backup could not be imported. Use an unmodified Gatherly JSON backup under 25 MB. Your current plans have not changed.",
      );
    } finally {
      if (sequence === readSequence.current) {
        setBusy(false);
        input.value = "";
      }
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE HOUSEKEEPING"
        title="Your space. Your plans."
        description="Manage your event details, keep a backup and understand how your data is handled."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <span className="large-icon sage">
            <Pencil size={22} />
          </span>
          <h2>The event details</h2>
          <p>
            Update the name, date, location, expected guests and overall budget
            for <strong>{event.title}</strong>.
          </p>
          <button className="button secondary" onClick={onEdit}>
            <Pencil size={16} />
            Edit event details
          </button>
        </section>
        <section className="panel settings-card">
          <span className="large-icon peach">
            <FileJson size={22} />
          </span>
          <h2>Keep your plans close</h2>
          <p>
            Your {workspace.events.length} events are saved in this browser.
            Export a backup to keep a copy or move your plans to another device.
          </p>
          <div className="button-group">
            <button
              className="button primary"
              onClick={() => {
                downloadFile(
                  "gatherly-backup.json",
                  JSON.stringify(workspace, null, 2),
                );
                notify("Your workspace backup is ready.");
              }}
            >
              <Download size={16} />
              Export backup
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => ref.current?.click()}
            >
              <Upload size={16} />
              Import
            </button>
            <input
              ref={ref}
              className="sr-only"
              tabIndex={-1}
              aria-label="Choose Gatherly backup file"
              type="file"
              accept="application/json,.json"
              onChange={importFile}
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {incoming && (
            <div className="import-confirm" data-workspace-draft="true">
              <strong>Import {incoming.events.length} events?</strong>
              <p>
                This replaces this browser’s current workspace. Export your
                current backup first if you need it.
              </p>
              <div className="button-group">
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    setError("");
                    setBusy(true);
                    try {
                      if (await onImport(incoming)) {
                        setIncoming(null);
                        notify("Workspace imported and saved on your device.");
                      } else
                        setError(
                          "The import was not saved. Your current workspace is still available. Export it before trying again.",
                        );
                    } catch {
                      setError(
                        "The import could not be saved. Your current workspace has not been replaced.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Replace workspace
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setIncoming(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <p role="status" className="field-note">
            {busy ? "Checking and saving your backup…" : ""}
          </p>
        </section>
        <section className="panel settings-card privacy-card">
          <span className="large-icon lilac">
            <ShieldCheck size={23} />
          </span>
          <h2>A little privacy, by design.</h2>
          <ul>
            <li>
              Event plans, guest notes and vendor contacts are stored locally on
              this browser. There is no cloud sync or shared account.
            </li>
            <li>
              Live AI sends only the event brief and your planning request to
              OpenRouter and the selected provider, after your consent.
            </li>
            <li>
              Your OpenRouter API key stays on the server. The private AI access
              code is held in memory for this session.
            </li>
            <li>
              Clearing browser data removes saved plans. Anyone using this
              browser profile may be able to view them.
            </li>
            <li>
              Backups contain your event data. Store exported files somewhere
              you trust.
            </li>
          </ul>
        </section>
        <section className="panel settings-card">
          <span className="large-icon sand">
            <LockKeyhole size={22} />
          </span>
          <h2>Enable a little extra intelligence</h2>
          <p>
            In your Render service’s Environment settings, replace{" "}
            <code>OPENROUTER_API_KEY</code> and <code>AI_ACCESS_CODE</code> with
            real values, then redeploy. No code change is needed.
          </p>
          <p>
            Use an OpenRouter key with a spending limit. The app limits
            generation requests and supports a searchable text-model catalog.
          </p>
          <span className="status-badge contacted">
            The OpenRouter API key stays on the server
          </span>
        </section>
        <section className="panel settings-card delete-card">
          <div>
            <h2>Let this event go</h2>
            <p>
              Delete <strong>{event.title}</strong> and its locally saved
              details. Keep a backup if you might need it later.
            </p>
          </div>
          <button
            className="button danger-outline"
            disabled={workspace.events.length === 1}
            onClick={onDelete}
          >
            <Trash2 size={16} />
            Delete event
          </button>
          {workspace.events.length === 1 && (
            <small>Create another event before deleting your last one.</small>
          )}
        </section>
      </div>
    </>
  );
}
