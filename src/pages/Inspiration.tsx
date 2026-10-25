import { useState, type FormEvent } from "react";
import {
  Bookmark,
  Flower2,
  Lightbulb,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Botanical,
  Confirm,
  Empty,
  Modal,
  PageHeading,
} from "../components/ui";
import { ideaSchema, uid } from "../lib/domain.ts";
import type { Event } from "../lib/types";
export function Inspiration({
  event,
  onUpdate,
  notify,
}: {
  event: Event;
  onUpdate: (e: Event) => void;
  notify: (s: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ideas = event.ideas.filter((i) => filter === "all" || i.saved);
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = ideaSchema.safeParse({
      id: uid(),
      title: f.get("title"),
      detail: f.get("detail"),
      tag: f.get("tag"),
      saved: true,
    });
    if (!r.success) {
      setError("Add a title, a description and a tag for your idea.");
      return;
    }
    if (event.ideas.length >= 100) {
      setError("You can keep up to 100 ideas per event.");
      return;
    }
    onUpdate({ ...event, ideas: [...event.ideas, r.data] });
    setAdding(false);
    notify("Your idea has a home.");
  }
  return (
    <>
      <PageHeading
        eyebrow="LITTLE DETAILS. LASTING MEMORIES."
        title="A celebration that feels like you."
        description="Thoughtful starting points, personal touches and a space for your own bright ideas."
        action={
          <button
            className="button primary"
            onClick={() => {
              setAdding(true);
              setError("");
            }}
          >
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
                    onUpdate({
                      ...event,
                      ideas: event.ideas.map((i) =>
                        i.id === idea.id ? { ...i, saved: !i.saved } : i,
                      ),
                    })
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
      {adding && (
        <Modal title="A bright little idea." onClose={() => setAdding(false)}>
          <form onSubmit={add}>
            <div className="form-grid">
              <label className="span-2">
                Idea title
                <input name="title" required maxLength={160} />
              </label>
              <label className="span-2">
                The details
                <textarea name="detail" required maxLength={600} rows={4} />
              </label>
              <label className="span-2">
                Tag
                <input
                  name="tag"
                  required
                  maxLength={50}
                  defaultValue="Personal touch"
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button className="button primary">Save idea</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Let this idea go?"
          description="This idea will be removed from your event’s inspiration board."
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onUpdate({
              ...event,
              ideas: event.ideas.filter((i) => i.id !== deleting),
            });
            notify("Idea removed.");
          }}
        />
      )}
    </>
  );
}
