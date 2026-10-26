import { Sparkles } from "lucide-react";
import { nav } from "../lib/navigation";
import type { Page } from "../lib/types";
export function WorkspaceNavigation({
  page,
  vendorCount,
  navigate,
}: {
  page: Page;
  vendorCount: number;
  navigate: (page: Page) => void;
}) {
  return (
    <>
      <div className="nav-label">YOUR WORKSPACE</div>
      {nav.map((n) => (
        <button
          key={n.id}
          className={`nav-item ${page === n.id ? "active" : ""}`}
          aria-current={page === n.id ? "page" : undefined}
          onClick={() => navigate(n.id)}
        >
          <n.icon size={19} />
          {n.label}
          {n.id === "vendors" && vendorCount > 0 && (
            <span className="nav-count">{vendorCount}</span>
          )}
        </button>
      ))}
      <div className="nav-divider" />
      <button
        className={`nav-item ${page === "studio" ? "active" : ""}`}
        aria-current={page === "studio" ? "page" : undefined}
        onClick={() => navigate("studio")}
      >
        <Sparkles size={19} />
        AI planning studio<span className="tiny-badge">AI</span>
      </button>
    </>
  );
}
