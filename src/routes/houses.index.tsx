import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { houses } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Header, Section } from "@/components/ui-bits";

export const Route = createFileRoute("/houses/")({
  head: () => ({
    meta: [
      { title: "Houses — Spacious Bay Construction" },
      { name: "description", content: "Progress, punch lists and inspections for houses #5–#18." },
      { property: "og:title", content: "Houses — Spacious Bay Construction" },
      { property: "og:description", content: "Progress, punch lists and inspections for houses #5–#18." },
    ],
  }),
  component: HousesPage,
});

function HousesPage() {
  const { punch } = useStore();
  const [only, setOnly] = useState<"all" | "homes" | "land" | "incomplete">("all");

  const list = houses.filter((h) => {
    if (only === "homes") return h.kind === "home";
    if (only === "land") return h.kind === "land";
    if (only === "incomplete") return h.completion < 100;
    return true;
  });

  return (
    <div>
      <Header title="Houses" sub="#5–#15 homes · #16–#18 parking & land" />
      <div className="flex gap-2 overflow-x-auto px-4 pt-3">
        {(["all", "homes", "land", "incomplete"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setOnly(f)}
            className={`tap shrink-0 rounded-full px-4 text-sm font-bold uppercase ${
              only === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <Section title="All lots">
        <div className="grid grid-cols-2 gap-3">
          {list.map((h) => {
            const open = punch.filter((p) => p.house === h.id && !p.done).length;
            return (
              <Link key={h.id} to="/houses/$id" params={{ id: h.id }} className="card-pad block">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl leading-none">#{h.id}</span>
                  {open > 0 ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                      {open} open
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{h.stage}</p>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-ok" style={{ width: `${h.completion}%` }} />
                </div>
                <p className="mt-1 text-xs font-bold">{h.completion}% complete</p>
              </Link>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
