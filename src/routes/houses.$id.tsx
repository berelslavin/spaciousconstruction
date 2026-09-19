import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { contractorById, houses } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Empty, Header, Section, StatusTag } from "@/components/ui-bits";

export const Route = createFileRoute("/houses/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `House #${params.id} — Spacious Bay Construction` },
      { name: "description", content: `Current work, punch list and inspections for house #${params.id}.` },
      { property: "og:title", content: `House #${params.id} — Spacious Bay Construction` },
      { property: "og:description", content: `Current work, punch list and inspections for house #${params.id}.` },
    ],
  }),
  loader: ({ params }) => {
    const house = houses.find((h) => h.id === params.id);
    if (!house) throw notFound();
    return { id: params.id };
  },
  component: HousePage,
});

function HousePage() {
  const { id } = Route.useParams();
  const house = houses.find((h) => h.id === id)!;
  const { tasks, punch, togglePunch } = useStore();

  const work = tasks.filter((t) => t.house === id);
  const items = punch.filter((p) => p.house === id);

  return (
    <div>
      <Header title={`House #${house.id}`} sub={house.stage} back="/houses" />

      <Section title="Progress">
        <div className="card-pad">
          <div className="h-3 rounded-full bg-muted">
            <div className="h-3 rounded-full bg-ok" style={{ width: `${house.completion}%` }} />
          </div>
          <p className="mt-2 text-sm font-bold">{house.completion}% complete</p>
          {house.notes ? <p className="mt-1 text-sm text-muted-foreground">{house.notes}</p> : null}
        </div>
      </Section>

      <Section title="Current work">
        {work.length === 0 ? (
          <Empty>No crews scheduled here today or tomorrow.</Empty>
        ) : (
          <div className="space-y-2">
            {work.map((t) => (
              <div key={t.id} className="card-pad flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{contractorById(t.contractorId)?.name}</p>
                  <p className="text-sm">{t.task}</p>
                  <p className="text-xs uppercase text-muted-foreground">{t.day}</p>
                </div>
                <StatusTag status={t.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Punch list">
        {items.length === 0 ? (
          <Empty>No punch items on this house.</Empty>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePunch(p.id)}
                className="card-pad flex w-full items-start gap-3 text-left"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                    p.done ? "border-ok bg-ok text-ok-foreground" : "border-border"
                  }`}
                >
                  {p.done ? "✓" : ""}
                </span>
                <span>
                  <span className={`block font-semibold ${p.done ? "line-through opacity-60" : ""}`}>
                    {p.what}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {contractorById(p.contractorId)?.name} · due {p.due}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Inspections">
        {house.inspections.length === 0 ? (
          <Empty>No inspections yet.</Empty>
        ) : (
          <div className="space-y-2">
            {house.inspections.map((i) => (
              <div key={i.name} className="card-pad flex items-center justify-between">
                <span>
                  <span className="block font-semibold">{i.name}</span>
                  <span className="text-sm text-muted-foreground">{i.date}</span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                    i.result === "passed"
                      ? "bg-ok text-ok-foreground"
                      : i.result === "failed"
                        ? "bg-bad text-bad-foreground"
                        : "bg-warn text-warn-foreground"
                  }`}
                >
                  {i.result}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Photos">
        {house.photos.length === 0 ? (
          <Empty>No photos yet.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {house.photos.map((p) => (
              <div key={p.caption} className="card-pad">
                <div className="flex h-24 items-center justify-center rounded-lg bg-surface text-3xl">📷</div>
                <p className="mt-2 text-sm font-semibold">{p.caption}</p>
                <p className="text-xs text-muted-foreground">{p.date}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Money">
        <Link to="/money" className="card-pad tap block w-full font-bold text-primary">
          View quotes & payments →
        </Link>
      </Section>
    </div>
  );
}
