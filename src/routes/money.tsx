import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { contractorById, houses, money, nearestFriday } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Empty, Header, Section } from "@/components/ui-bits";

export const Route = createFileRoute("/money")({
  head: () => ({
    meta: [
      { title: "Money — Spacious Bay Construction" },
      { name: "description", content: "Quotes, approved additions, payments and remaining balances by contractor and house." },
      { property: "og:title", content: "Money — Spacious Bay Construction" },
      { property: "og:description", content: "Quotes, approved additions, payments and remaining balances by contractor and house." },
    ],
  }),
  component: MoneyPage,
});

const METHODS = ["Check", "ACH", "Zelle", "Card"];

function MoneyPage() {
  const { money: rows, applyMoney } = useStore();
  const [house, setHouse] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [payment, setPayment] = useState("");
  const [addition, setAddition] = useState("");
  const [method, setMethod] = useState("Check");

  const friday = nearestFriday();
  const list = rows.filter((m) => house === "all" || m.house === house);
  const totalDue = list.reduce((s, m) => s + (m.quote + m.additions - m.paid), 0);

  function reset() {
    setEditing(null);
    setPayment("");
    setAddition("");
    setMethod("Check");
  }

  return (
    <div>
      <Header title="Money" sub={`${money(totalDue)} remaining · accounting date ${friday}`} />

      <div className="px-4 pt-3">
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
      </div>

      <Section title="Contracts">
        {list.length === 0 ? (
          <Empty>No contracts for this house.</Empty>
        ) : (
          <div className="space-y-3">
            {list.map((m) => {
              const contracted = m.quote + m.additions;
              const balance = contracted - m.paid;
              const open = editing === m.id;
              const pay = Number(payment) || 0;
              const add = Number(addition) || 0;
              const newContracted = contracted + add;
              const newPaid = m.paid + pay;
              const overage = newPaid > newContracted;

              return (
                <div key={m.id} className="card-pad">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{contractorById(m.contractorId)?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        House #{m.house} · {m.quoteNumber}
                      </p>
                    </div>
                    <span className="font-display text-2xl">{money(balance)}</span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Original quote</dt>
                    <dd className="text-right font-semibold">{money(m.quote)}</dd>
                    <dt className="text-muted-foreground">Approved additions</dt>
                    <dd className="text-right font-semibold">{money(m.additions)}</dd>
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="text-right font-semibold">{money(m.paid)}</dd>
                    <dt className="text-muted-foreground">Remaining</dt>
                    <dd className="text-right font-semibold">{money(balance)}</dd>
                    <dt className="text-muted-foreground">Method · last paid</dt>
                    <dd className="text-right font-semibold">
                      {m.method} · {m.lastPayment}
                    </dd>
                  </dl>

                  <button
                    onClick={() => (open ? reset() : (reset(), setEditing(m.id)))}
                    className="tap mt-3 w-full rounded-xl bg-muted font-bold uppercase text-foreground"
                  >
                    {open ? "Cancel" : "Record payment / addition"}
                  </button>

                  {open ? (
                    <div className="mt-3 space-y-2 rounded-xl bg-surface p-3">
                      <input
                        inputMode="numeric"
                        value={payment}
                        onChange={(e) => setPayment(e.target.value)}
                        placeholder="Payment amount"
                        className="tap w-full rounded-xl border border-border bg-card px-3 text-base"
                      />
                      <input
                        inputMode="numeric"
                        value={addition}
                        onChange={(e) => setAddition(e.target.value)}
                        placeholder="Approved addition"
                        className="tap w-full rounded-xl border border-border bg-card px-3 text-base"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {METHODS.map((x) => (
                          <button
                            key={x}
                            onClick={() => setMethod(x)}
                            className={`tap rounded-lg text-xs font-bold uppercase ${
                              method === x ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {x}
                          </button>
                        ))}
                      </div>

                      <div className="rounded-xl border border-border bg-card p-3 text-sm">
                        <p className="font-bold uppercase">Preview before saving</p>
                        <p className="mt-1">
                          Contracted {money(contracted)} → <strong>{money(newContracted)}</strong>
                        </p>
                        <p>
                          Paid {money(m.paid)} → <strong>{money(newPaid)}</strong>
                        </p>
                        <p>
                          Remaining {money(balance)} →{" "}
                          <strong>{money(newContracted - newPaid)}</strong>
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Recorded on Friday {friday} · {method}
                        </p>
                        {overage ? (
                          <p className="mt-2 rounded-lg bg-bad px-2 py-1.5 font-bold text-bad-foreground">
                            Warning: this pays {money(newPaid - newContracted)} more than the
                            approved contract.
                          </p>
                        ) : null}
                      </div>

                      <button
                        disabled={pay === 0 && add === 0}
                        onClick={() => {
                          applyMoney(m.id, { additions: add, paid: pay, method, date: friday });
                          reset();
                        }}
                        className="tap w-full rounded-xl bg-primary font-bold uppercase text-primary-foreground disabled:opacity-40"
                      >
                        {overage ? "Confirm overage & save" : "Save"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
