import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { contractorById, contractors } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Empty, Header, Section, StatusPicker, StatusTag } from "@/components/ui-bits";
import { chicagoTime, useTodayCheckins } from "@/lib/checkins";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Spacious Bay Construction" },
      { name: "description", content: "Daily crew schedule, confirmations and deliveries for the Spacious Bay build." },
      { property: "og:title", content: "Today — Spacious Bay Construction" },
      { property: "og:description", content: "Daily crew schedule, confirmations and deliveries for the Spacious Bay build." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { tasks, deliveries, setTaskStatus, setDeliveryStatus } = useStore();
  const [day, setDay] = useState<"today" | "tomorrow">("today");

  const dayTasks = useMemo(() => tasks.filter((t) => t.day === day), [tasks, day]);
  const byContractor = useMemo(() => {
    const map = new Map<string, typeof dayTasks>();
    for (const t of dayTasks) {
      map.set(t.contractorId, [...(map.get(t.contractorId) ?? []), t]);
    }
    return [...map.entries()];
  }, [dayTasks]);
  const checkins = useTodayCheckins();
  const expected = byContractor.length;
  const checkedCount = byContractor.filter(([cid]) => checkins.map[cid]).length;

  const missing = contractors.filter(
    (c) => c.regular && !dayTasks.some((t) => t.contractorId === c.id),
  );
  const dayDeliveries = deliveries.filter((d) => d.day === day);

  return (
    <div>
      <Header title="Spacious Bay" sub="Port Isabel — houses #5–#18" />

      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        {(["today", "tomorrow"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`tap rounded-xl text-base font-bold uppercase ${
              day === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <Section title="Schedule">
        {byContractor.length === 0 ? (
          <Empty>Nothing scheduled.</Empty>
        ) : day === "today" ? (
          <div>
            <p className="mb-1 text-sm font-bold text-muted-foreground">
              {expected} expected · {checkedCount} came · {expected - checkedCount} missing
            </p>
            <div className="divide-y divide-border">
              {byContractor.map(([cid, list]) => {
                const c = contractorById(cid)!;
                const at = checkins.map[cid];
                const work = list.map((t) => `#${t.house} ${t.task}`).join(" · ");
                return (
                  <div key={cid} className="flex items-center gap-2 py-1.5">
                    <Link to="/crews/$id" params={{ id: cid }} className="min-w-0 flex-1 py-1">
                      <p className="truncate text-base font-bold leading-tight">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{work}</p>
                    </Link>
                    {at ? (
                      <span className="flex min-h-11 shrink-0 items-center px-1 text-sm font-bold text-ok">
                        ✓ Came {chicagoTime(at)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!!checkins.pending[cid]}
                        onClick={() => checkins.checkIn(cid)}
                        className="min-h-11 shrink-0 px-2 text-sm font-bold text-primary underline underline-offset-4 disabled:opacity-60"
                      >
                        {checkins.pending[cid] ? "…" : "Mark came"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {byContractor.map(([cid, list]) => {
              const c = contractorById(cid)!;
              return (
                <div key={cid} className="card-pad">
                  <Link to="/crews/$id" params={{ id: cid }} className="block min-w-0">
                    <p className="text-base font-bold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.trade}</p>
                  </Link>
                  <div className="mt-2 space-y-3">
                    {list.map((t) => (
                      <div key={t.id} className="rounded-lg bg-surface p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-xl leading-none">#{t.house}</p>
                            <p className="mt-1 text-sm">{t.task}</p>
                            <p className="text-xs text-muted-foreground">{t.time} am</p>
                          </div>
                          <StatusTag status={t.status} />
                        </div>
                        <StatusPicker value={t.status} onChange={(s) => setTaskStatus(t.id, s)} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Not Scheduled">
        {missing.length === 0 ? (
          <Empty>Every regular crew has work {day}.</Empty>
        ) : (
          <div className="space-y-2">
            {missing.map((c) => (
              <Link
                key={c.id}
                to="/crews/$id"
                params={{ id: c.id }}
                className="card-pad flex items-center justify-between"
              >
                <span>
                  <span className="block font-bold">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{c.trade}</span>
                </span>
                <span className="rounded-full bg-warn px-2.5 py-1 text-xs font-bold uppercase text-warn-foreground">
                  No work
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Deliveries">
        {dayDeliveries.length === 0 ? (
          <Empty>No deliveries {day}.</Empty>
        ) : (
          <div className="space-y-3">
            {dayDeliveries.map((d) => (
              <div key={d.id} className="card-pad">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{d.what}</p>
                    <p className="text-sm text-muted-foreground">
                      #{d.house} · {d.supplier}
                    </p>
                    <p className="text-xs text-muted-foreground">{d.window}</p>
                  </div>
                  <StatusTag status={d.status} />
                </div>
                <StatusPicker value={d.status} onChange={(s) => setDeliveryStatus(d.id, s)} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
