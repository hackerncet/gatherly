import { IdeaEditor } from "../components/editors/IdeaEditor";
import { useEventRecords } from "../lib/useEventRecords";
import type { EventPageProps } from "../lib/commands";
import { useState } from "react";
import {
  Bookmark,
  Flower2,
  Lightbulb,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Botanical } from "../components/Botanical";
import { Confirm } from "../components/Confirm";
import { Empty, PageHeading } from "../components/ui";
export function Inspiration({ event, onUpdate, notify }: EventPageProps) {
  const records = useEventRecords("ideas", onUpdate, notify);
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const ideas = event.ideas.filter((i) => filter === "all" || i.saved);

  return (
    <>
      <PageHeading
        eyebrow="LITTLE DETAILS. LASTING MEMORIES."
        title="A celebration that feels like you."
        description="Thoughtful starting points, personal touches and a space for your own bright ideas."
        action={
          <button className="button primary" onClick={records.create}>
            <Plus size={17} />
            Add an idea
          </button>
        }
      />
      <div className="inspiration-banner">
        <div>
          <Flower2 size={27} />
          <h2>Meaningful beats extravagant.</h2>
          <p>
            The most memorable details are often the ones that tell your story.
          </p>
        </div>
        <Botanical />
      </div>
      <div className="filter-row" role="group" aria-label="Filter ideas">
        <button
          className={`filter-button ${filter === "all" ? "active" : ""}`}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All ideas<span>{event.ideas.length}</span>
        </button>
        <button
          className={`filter-button ${filter === "saved" ? "active" : ""}`}
          aria-pressed={filter === "saved"}
          onClick={() => setFilter("saved")}
        >
          <Bookmark size={15} />
          Saved ideas<span>{event.ideas.filter((i) => i.saved).length}</span>
        </button>
      </div>
      <div className="idea-grid">
        {ideas.length ? (
          ideas.map((idea, index) => (
            <article className="panel idea-card" key={idea.id}>
              <div className={`idea-art art-${index % 4}`}>
                <div className="art-shape shape-1" />
                <div className="art-shape shape-2" />
                <div className="art-shape shape-3" />
                <span className="art-icon">
                  {index % 2 ? (
                    <Flower2 size={47} strokeWidth={1} />
                  ) : (
                    <Sparkles size={47} strokeWidth={1} />
                  )}
                </span>
                <button
                  className={`save-idea ${idea.saved ? "saved" : ""}`}
                  aria-pressed={idea.saved}
                  aria-label={`${idea.saved ? "Unsave" : "Save"} ${idea.title}`}
                  onClick={() =>
                    records.change(idea.id, (current) => ({
                      ...current,
                      saved: !current.saved,
                    }))
                  }
                >
                  <Bookmark
                    size={19}
                    fill={idea.saved ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <div className="idea-copy">
                <span className="eyebrow">{idea.tag}</span>
                <h2>{idea.title}</h2>
                <p>{idea.detail}</p>
                <button
                  className="text-link muted"
                  onClick={() => setDeleting(idea.id)}
                >
                  <Trash2 size={13} />
                  Remove idea
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="panel span-all">
            <Empty
              icon={<Lightbulb />}
              title="A little inspiration is on its way"
              description="Save an idea you love or add one of your own."
            />
          </div>
        )}
      </div>
      {records.isOpen && (
        <IdeaEditor
          initial={records.initial}
          onSave={(record) => records.save(record, "Your idea has a home.")}
          onClose={records.close}
        />
      )}
      {deleting && (
        <Confirm
          title="Let this idea go?"
          description="This idea will be removed from your event’s inspiration board."
          onClose={() => setDeleting(null)}
          onConfirm={() => records.remove(deleting, "Idea removed.")}
        />
      )}
    </>
  );
}
