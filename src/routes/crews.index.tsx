import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TRADES, contractors } from "@/lib/data";
import { Header, Section } from "@/components/ui-bits";

export const Route = createFileRoute("/crews/")({
  head: () => ({
    meta: [
      { title: "Crews — Spacious Bay Construction" },
      { name: "description", content: "Contractors, trades, assigned houses and contact numbers." },
      { property: "og:title", content: "Crews — Spacious Bay Construction" },
      { property: "og:description", content: "Contractors, trades, assigned houses and contact numbers." },
    ],
  }),
  component: CrewsPage,
});

function CrewsPage() {
  const [trade, setTrade] = useState<string>("All");
  const list = contractors.filter((c) => trade === "All" || c.trade === trade);

  return (
    <div>
      <Header title="Crews" sub={`${contractors.length} contractors on the job`} />
      <div className="flex gap-2 overflow-x-auto px-4 pt-3">
        {["All", ...TRADES].map((t) => (
          <button
            key={t}
            onClick={() => setTrade(t)}
            className={`tap shrink-0 rounded-full px-4 text-sm font-bold ${
              trade === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <Section title="Contractors">
        <div className="space-y-2">
          {list.map((c) => (
            <Link key={c.id} to="/crews/$id" params={{ id: c.id }} className="card-pad block">
              <p className="text-base font-bold">{c.name}</p>
              <p className="text-sm text-muted-foreground">
                {c.trade} · houses {c.houses.map((h) => `#${h}`).join(", ") || "none"}
              </p>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
