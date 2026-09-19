import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { contractorById, contractors, houses } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Empty, Header, Section } from "@/components/ui-bits";

export const Route = createFileRoute("/punch")({
  head: () => ({
    meta: [
      { title: "Punch List — Spacious Bay Construction" },
      { name: "description", content: "Punch items by house, contractor and due date across the Spacious Bay build." },
      { property: "og:title", content: "Punch List — Spacious Bay Construction" },
      { property: "og:description", content: "Punch items by house, contractor and due date across the Spacious Bay build." },
    ],
  }),
  component: PunchPage,
});

function PunchPage() {
  const { punch, togglePunch, addPunch } = useStore();
  const [house, setHouse] = useState("all");
  const [crew, setCrew] = useState("all");
  const [openOnly, setOpenOnly] = useState(true);
  const [adding, setAdding] = useState(false);

  const [what, setWhat] = useState("");
  const [newHouse, setNewHouse] = useState("5");
  const [newCrew, setNewCrew] = useState(contractors[0]?.id ?? "");
  const [due, setDue] = useState("");

  const list = punch.filter(
    (p) =>
      (house === "all" || p.house === house) &&
      (crew === "all" || p.contractorId === crew) &&
      (!openOnly || !p.done),
  );

  return (
    <div>
      <Header title="Punch" sub={`${punch.filter((p) => !p.done).length} items open`} />

      <div className="space-y-2 px-4 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={house}
            onChange={(e) => setHouse(e.target.value)}
            className="tap w-full rounded-xl border border-border bg-card px-3 text-base"
          >
            <option value="all">All houses</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                House #{h.id}
              </option>
            ))}
          </select>
          <select
            value={crew}
            onChange={(e) => setCrew(e.target.value)}
            className="tap w-full rounded-xl border border-border bg-card px-3 text-base"
          >
            <option value="all">All crews</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setOpenOnly((v) => !v)}
          className={`tap w-full rounded-xl font-bold uppercase ${
            openOnly ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {openOnly ? "Showing open only" : "Showing everything"}
        </button>
      </div>

      <Section
        title="Items"
        right={
          <button
            onClick={() => setAdding((v) => !v)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold uppercase text-accent-foreground"
          >
            {adding ? "Close" : "+ Add"}
          </button>
        }
      >
        {adding ? (
          <div className="card-pad mb-3 space-y-2">
            <input
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="What needs fixing"
              className="tap w-full rounded-xl border border-border bg-card px-3 text-base"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newHouse}
                onChange={(e) => setNewHouse(e.target.value)}
                className="tap w-full rounded-xl border border-border bg-card px-3 text-base"
              >
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    House #{h.id}
                  </option>
                ))}
              </select>
              <select
                value={newCrew}
                onChange={(e) => setNewCrew(e.target.value)}
                className="tap w-full rounded-xl border border-border bg-card px-3 text-base"
              >
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={due}
              onChange={(e) => setDue(e.target.value)}
              placeholder="Due (e.g. Oct 03)"
              className="tap w-full rounded-xl border border-border bg-card px-3 text-base"
            />
            <button
              onClick={() => {
                if (!what.trim()) return;
                addPunch({ what: what.trim(), house: newHouse, contractorId: newCrew, due: due || "No date" });
                setWhat("");
                setDue("");
                setAdding(false);
              }}
              className="tap w-full rounded-xl bg-primary font-bold uppercase text-primary-foreground"
            >
              Save item
            </button>
          </div>
        ) : null}

        {list.length === 0 ? (
          <Empty>Nothing matches these filters.</Empty>
        ) : (
          <div className="space-y-2">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePunch(p.id)}
                className="card-pad flex w-full items-start gap-3 text-left"
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
                    p.done ? "border-ok bg-ok text-ok-foreground" : "border-border"
                  }`}
                >
                  {p.done ? "✓" : ""}
                </span>
                <span>
                  <span className={`block font-semibold ${p.done ? "line-through opacity-60" : ""}`}>
                    #{p.house} — {p.what}
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
    </div>
  );
}
