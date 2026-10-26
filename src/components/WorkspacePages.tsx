import { lazy, Suspense } from "react";
import { Logo } from "./Logo";
import { Overview } from "../pages/Overview";
import type { Event, Page, Workspace } from "../lib/types";
import type { UpdateEvent } from "../lib/commands";
const Guide = lazy(() =>
  import("../pages/Guide").then((m) => ({ default: m.Guide })),
);
const BudgetPage = lazy(() =>
  import("../pages/Budget").then((module) => ({ default: module.BudgetPage })),
);
const Timeline = lazy(() =>
  import("../pages/Timeline").then((module) => ({ default: module.Timeline })),
);
const Vendors = lazy(() =>
  import("../pages/Vendors").then((module) => ({ default: module.Vendors })),
);
const Guests = lazy(() =>
  import("../pages/Guests").then((module) => ({ default: module.Guests })),
);
const Inspiration = lazy(() =>
  import("../pages/Inspiration").then((module) => ({
    default: module.Inspiration,
  })),
);
const Studio = lazy(() =>
  import("../pages/Studio").then((module) => ({ default: module.Studio })),
);
const SettingsPage = lazy(() =>
  import("../pages/Settings").then((module) => ({
    default: module.SettingsPage,
  })),
);
export function WorkspacePages({
  page,
  event,
  workspace,
  updateEvent,
  navigate,
  addEvent,
  notify,
  service,
  onEdit,
  onDelete,
  onImport,
}: {
  page: Page;
  event: Event;
  workspace: Workspace;
  updateEvent: UpdateEvent;
  navigate: (page: Page) => void;
  addEvent: (event: Event) => void;
  notify: (message: string) => void;
  service: { enabled: boolean; message: string; retry: () => void };
  onEdit: () => void;
  onDelete: () => void;
  onImport: (workspace: Workspace) => Promise<boolean>;
}) {
  const common = { event, onUpdate: updateEvent, notify };
  const views = {
    overview: (
      <Overview
        event={event}
        onUpdate={updateEvent}
        navigate={navigate}
        onEdit={onEdit}
        notify={notify}
      />
    ),
    budget: <BudgetPage {...common} />,
    timeline: <Timeline {...common} />,
    vendors: <Vendors {...common} />,
    guests: <Guests {...common} />,
    inspiration: <Inspiration {...common} />,
    studio: (
      <Studio
        event={event}
        aiEnabled={service.enabled}
        serviceMessage={service.message}
        refreshStatus={service.retry}
        onCreate={addEvent}
        notify={notify}
      />
    ),
    settings: (
      <SettingsPage
        workspace={workspace}
        event={event}
        onImport={onImport}
        onDelete={onDelete}
        onEdit={onEdit}
        notify={notify}
      />
    ),
    guide: <Guide {...common} navigate={navigate} />,
  } satisfies Record<Page, React.ReactNode>;
  return (
    <Suspense
      fallback={
        <div className="page-loading" role="status">
          <Logo small />
          <p>Bringing your plans together…</p>
        </div>
      }
    >
      {views[page]}
    </Suspense>
  );
}
