import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { contractors, money } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Empty, Header, Section, StatusTag } from "@/components/ui-bits";

export const Route = createFileRoute("/crews/$id")({
  head: ({ params }) => {
    const c = contractors.find((x) => x.id === params.id);
    const title = `${c ? c.name : "Crew"} — Spacious Bay Construction`;
    const description = c
      ? `${c.trade} crew: assigned houses, current tasks and contact info.`
      : "Contractor details for the Spacious Bay build.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  loader: ({ params }) => {
    if (!contractors.some((c) => c.id === params.id)) throw notFound();
    return { id: params.id };
  },
  component: CrewPage,
});

function CrewPage() {
  const { id } = Route.useParams();
  const c = contractors.find((x) => x.id === id)!;
  const { tasks, punch, money: rows } = useStore();

  const current = tasks.filter((t) => t.contractorId === id);
  const openPunch = punch.filter((p) => p.contractorId === id && !p.done);
  const balance = rows
    .filter((m) => m.contractorId === id)
    .reduce((sum, m) => sum + (m.quote + m.additions - m.paid), 0);

  return (
    <div>
      <Header title={c.name} sub={c.trade} back="/crews" />

      <Section title="Contact">
        <div className="card-pad">
          <p className="font-semibold">{c.contact}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a href={`tel:${c.phone}`} className="tap rounded-xl bg-primary font-bold text-primary-foreground">
              Call
            </a>
            <a href={`sms:${c.phone}`} className="tap rounded-xl bg-muted font-bold text-foreground">
              Text
            </a>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{c.phone}</p>
        </div>
      </Section>

      <Section title="Assigned houses">
        <div className="flex flex-wrap gap-2">
          {c.houses.map((h) => (
            <Link
              key={h}
              to="/houses/$id"
              params={{ id: h }}
              className="tap rounded-xl bg-surface px-4 font-display text-xl"
            >
              #{h}
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Current tasks">
        {current.length === 0 ? (
          <Empty>Nothing scheduled today or tomorrow.</Empty>
        ) : (
          <div className="space-y-2">
            {current.map((t) => (
              <div key={t.id} className="card-pad flex items-start justify-between gap-2">
                <span>
                  <span className="block font-bold">
                    #{t.house} · {t.task}
                  </span>
                  <span className="text-xs uppercase text-muted-foreground">{t.day}</span>
                </span>
                <StatusTag status={t.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Open punch items">
        {openPunch.length === 0 ? (
          <Empty>No open punch items.</Empty>
        ) : (
          <ul className="space-y-2">
            {openPunch.map((p) => (
              <li key={p.id} className="card-pad text-sm">
                #{p.house} — {p.what} <span className="text-muted-foreground">(due {p.due})</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Completed work">
        {c.completed.length === 0 ? (
          <Empty>Nothing closed out yet.</Empty>
        ) : (
          <ul className="card-pad space-y-1 text-sm">
            {c.completed.map((w) => (
              <li key={w}>✓ {w}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Balance">
        <Link to="/money" className="card-pad block">
          <span className="block font-display text-3xl">{money(balance)}</span>
          <span className="text-sm text-muted-foreground">remaining across contracts →</span>
        </Link>
      </Section>
    </div>
  );
}
