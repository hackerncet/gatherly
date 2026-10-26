import { ToastNotification } from "./components/ToastNotification";
import { useToast } from "./lib/useToast";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceNavigation } from "./components/WorkspaceNavigation";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { WorkspacePages } from "./components/WorkspacePages";
import { pageFromHash, pageTitles } from "./lib/navigation";
import {
  activeEvent,
  changeWorkspaceEvent,
  appendWorkspaceEvent,
  removeWorkspaceEvent,
} from "./lib/workspace";
import { useEffect, useRef, useState } from "react";
import { Settings, Plus, ShieldCheck, Download } from "lucide-react";
import { Logo } from "./components/Logo";
import { Modal } from "./components/Modal";
import { Confirm } from "./components/Confirm";
import { EventForm } from "./components/EventForm";
import { eventFromPlan, reviseEvent } from "./lib/events.ts";
import { downloadFile } from "./lib/storage";
import { PageBoundary } from "./components/PageBoundary";
import { useServiceStatus } from "./lib/useServiceStatus";
import { useWorkspace } from "./lib/useWorkspace";
import type { Brief, Event, Page } from "./lib/types";
import {
  COMMAND_OK,
  commandFailure,
  type CommandResult,
  type EventChange,
} from "./lib/commands";
export default function App() {
  const {
    workspace,
    busy,
    setWorkspace,
    ready,
    warning,
    blocked: saveBlocked,
    status: saveStatus,
    recovery,
    hasSavedData,
    reload,
    replace,
  } = useWorkspace();
  const [page, setPage] = useState<Page>(pageFromHash);
  const [modal, setModal] = useState<
    "create" | "edit" | "menu" | "help" | null
  >(null);
  const { toast, notify } = useToast();
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const service = useServiceStatus();

  const headingRef = useRef<HTMLElement>(null);
  const event = activeEvent(workspace);
  useEffect(() => {
    document.title = `${pageTitles[page]} · Gatherly`;
    headingRef.current?.focus();
  }, [page, ready]);
  useEffect(() => {
    const update = () => {
      setPage(pageFromHash());
      setSearch("");
    };
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("hashchange", update);
    };
  }, []);
  function navigate(next: Page) {
    setPage(next);
    location.hash = next;
    setSearch("");
    setModal(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function updateEvent(change: EventChange): CommandResult {
    try {
      setWorkspace((w) => changeWorkspaceEvent(w, event.id, change));
      return COMMAND_OK;
    } catch (error) {
      return commandFailure(error, "This change could not be applied.");
    }
  }
  function addEvent(next: Event) {
    try {
      setWorkspace((w) => appendWorkspaceEvent(w, next));
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "This event could not be added.",
        "error",
      );
      return;
    }
    navigate("overview");
    notify("Your event is ready. Let’s make it memorable.");
  }
  function saveBrief(brief: Brief, shiftTimeline = true) {
    if (modal === "edit") {
      const result = updateEvent((current) =>
        reviseEvent(current, brief, shiftTimeline),
      );
      if (!result.ok) {
        notify(result.error, "error");
        return;
      }
      setModal(null);
      notify("Event details updated.");
    } else addEvent(eventFromPlan(brief));
  }
  if (!ready)
    return (
      <div className="page-loading" role="status">
        <Logo />
        <p>Opening your saved planning space…</p>
      </div>
    );
  return (
    <>
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
        className="skip-link"
      >
        Skip to content
      </a>
      <div inert={busy || undefined}>
        <Sidebar
          page={page}
          vendorCount={event.vendors.length}
          saveStatus={saveStatus}
          navigate={navigate}
          onHelp={() => setModal("help")}
        />
        <div className="app-shell">
          <WorkspaceHeader
            event={event}
            workspace={workspace}
            search={search}
            setSearch={setSearch}
            onMenu={() => setModal("menu")}
            onCreate={() => setModal("create")}
            onSelect={(id) => setWorkspace((w) => ({ ...w, activeId: id }))}
            navigate={navigate}
          />
          {warning && (
            <div className="warning-banner" role="alert">
              <span>{warning}</span>
              <button
                onClick={() =>
                  downloadFile(
                    "gatherly-backup.json",
                    JSON.stringify(workspace, null, 2),
                  )
                }
              >
                <Download size={16} />
                Export
              </button>
              {recovery && (
                <button
                  onClick={() =>
                    downloadFile("gatherly-recovery.json", recovery)
                  }
                >
                  Download recovery data
                </button>
              )}
              {saveBlocked && hasSavedData && (
                <button onClick={() => void reload()}>
                  Load latest saved workspace
                </button>
              )}
              {saveBlocked && !hasSavedData && (
                <button
                  onClick={() => {
                    void replace(workspace);
                  }}
                >
                  Save recovery workspace
                </button>
              )}
            </div>
          )}
          <main
            id="main-content"
            ref={headingRef}
            tabIndex={-1}
            className={`main-content page-${page}`}
          >
            <PageBoundary
              resetKey={`${page}-${event.id}`}
              onHome={() => navigate("overview")}
              onBackup={() =>
                downloadFile(
                  "gatherly-backup.json",
                  JSON.stringify(workspace, null, 2),
                )
              }
            >
              <WorkspacePages
                key={event.id}
                page={page}
                event={event}
                workspace={workspace}
                updateEvent={updateEvent}
                navigate={navigate}
                addEvent={addEvent}
                notify={notify}
                service={service}
                onEdit={() => setModal("edit")}
                onDelete={() => setDeleting(true)}
                onImport={replace}
              />
            </PageBoundary>
            <footer className="app-footer">
              <span>Made for the moments that matter.</span>
              <span>
                <ShieldCheck size={13} />
                Your plans stay in your browser
              </span>
              <span>Gatherly · 2026</span>
            </footer>
          </main>
        </div>
      </div>
      {busy && (
        <p className="workspace-operation" role="status">
          Saving your workspace. Please wait…
        </p>
      )}
      {modal === "create" && (
        <Modal
          wide
          title="Something wonderful starts here."
          description="Tell us a little. We’ll help you bring it all together."
          onClose={() => setModal(null)}
        >
          <EventForm onSave={saveBrief} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === "edit" && (
        <Modal
          wide
          title="The little details."
          description="Update your event. Existing budget lines and checklists stay editable."
          onClose={() => setModal(null)}
        >
          <EventForm
            initial={event}
            onSave={saveBrief}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "menu" && (
        <Modal title="Your planning space" onClose={() => setModal(null)}>
          <nav aria-label="Mobile navigation">
            <WorkspaceNavigation
              page={page}
              vendorCount={event.vendors.length}
              navigate={navigate}
            />
            <button className="nav-item" onClick={() => navigate("settings")}>
              <Settings size={18} />
              Settings & data
            </button>
            <button
              className="button primary full-width"
              onClick={() => setModal("create")}
            >
              <Plus size={18} />
              New event
            </button>
          </nav>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="A little guidance goes a long way."
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <p>
              Start with <strong>New event</strong> and choose a wedding,
              birthday or community celebration. Your starter plan includes a
              budget, timeline and personalized starting ideas.
            </p>
            <p>
              Edit your budget and record payments, check off tasks, add real
              vendors and keep track of RSVPs. Sample entries are placeholders,
              not recommendations or bookings.
            </p>
            <p>
              Use <strong>AI planning studio</strong> to preview an AI plan
              after the owner adds the server key and private access code.
              Creating a plan never books a vendor or spends your budget.
            </p>
            <p>
              Plans are saved only in this browser. Export a backup in Settings
              to move them to another device. Clearing browser data removes
              local plans.
            </p>
          </div>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Delete this event?"
          description={`“${event.title}” and its budget, guests and checklists will be removed from this browser. Export a backup first if you need it.`}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            try {
              setWorkspace((w) => removeWorkspaceEvent(w, event.id));
            } catch (error) {
              return commandFailure(error, "This event could not be deleted.");
            }
            notify("Event deleted.");
            return COMMAND_OK;
          }}
        />
      )}
      <ToastNotification toast={toast} />
    </>
  );
}
