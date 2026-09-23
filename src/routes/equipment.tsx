import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment — Spacious Bay Field" },
      { name: "description", content: "Check out, transfer, return or report a site machine in a few taps." },
      { property: "og:title", content: "Equipment — Spacious Bay Field" },
      { property: "og:description", content: "Check out, transfer, return or report a site machine in a few taps." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EquipmentPage,
});

type Flow = "checkout" | "transfer" | "return" | "issue";
type Asset = { id: string; code: string; name: string; category: string };
type Custody = { worker: string; house: string } | null;
type EventRow = {
  asset_id: string;
  type: string;
  worker: string;
  to_worker: string;
  house: string;
  created_at: string;
};

const FLOW_TITLE: Record<Flow, string> = {
  checkout: "Check out machine",
  transfer: "Transfer machine",
  return: "Return machine",
  issue: "Report issue",
};

const WORKER_KEY = "spaciousbay.field.worker";

const HOUSES = [
  "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18",
];

export function EquipmentPage() {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [custody, setCustody] = useState<Map<string, Custody>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [worker, setWorkerState] = useState("");
  const [receipt, setReceipt] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(WORKER_KEY);
    if (saved) setWorkerState(saved);
  }, []);

  const setWorker = (name: string) => {
    const clean = name.trim();
    setWorkerState(clean);
    if (clean) window.localStorage.setItem(WORKER_KEY, clean);
  };

  const load = async () => {
    const [assetRes, eventRes] = await Promise.all([
      supabase.from("equipment_assets").select("id, code, name, category").eq("status", "active").order("code"),
      supabase
        .from("equipment_events")
        .select("asset_id, type, worker, to_worker, house, created_at")
        .order("created_at", { ascending: true })
        .limit(2000),
    ]);
    if (assetRes.error) throw new Error(assetRes.error.message);
    if (eventRes.error) throw new Error(eventRes.error.message);
    setAssets((assetRes.data ?? []) as Asset[]);
    setCustody(custodyFrom((eventRes.data ?? []) as EventRow[]));
  };

  useEffect(() => {
    let alive = true;
    load()
      .catch((e) => alive && setLoadError(String(e?.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const done = async (summary: string) => {
    await load();
    setReceipt(summary);
    setFlow(null);
  };

  if (receipt) {
    return (
      <Shell title="Logged">
        <div className="border-2 border-field-go bg-field-panel p-5 text-center">
          <div className="text-6xl leading-none text-field-go">✓</div>
          <p className="mt-3 text-xl font-bold uppercase leading-tight text-field-ink">{receipt}</p>
        </div>
        <button type="button" className="big mt-4 w-full bg-field-accent text-field-accent-ink" onClick={() => setReceipt("")}>
          Back to start
        </button>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell title="Equipment">
        <p className="text-lg text-field-dim">Loading machines…</p>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell title="Equipment">
        <div className="border-2 border-field-stop bg-field-panel p-4">
          <p className="font-bold uppercase text-field-ink">Could not load</p>
          <p className="mt-1 text-sm text-field-dim">{loadError}</p>
        </div>
        <button
          type="button"
          className="big mt-4 w-full bg-field-accent text-field-accent-ink"
          onClick={() => {
            setLoadError("");
            setLoading(true);
            load().catch((e) => setLoadError(String(e?.message ?? e))).finally(() => setLoading(false));
          }}
        >
          Try again
        </button>
      </Shell>
    );
  }

  if (!flow) {
    return (
      <Shell title="Equipment">
        <h2 className="mb-4 text-3xl font-bold uppercase leading-none text-field-ink">
          What are you doing?
        </h2>
        <div className="space-y-3">
          {(Object.keys(FLOW_TITLE) as Flow[]).map((f) => (
            <button key={f} type="button" className="big w-full bg-field-panel text-field-ink" onClick={() => setFlow(f)}>
              {FLOW_TITLE[f]}
              {f === "return" ? <span className="block text-sm font-normal text-field-dim">or end of day</span> : null}
              {f === "issue" ? <span className="block text-sm font-normal text-field-dim">damage, fault, missing</span> : null}
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-field-line pt-4">
          <p className="text-sm uppercase tracking-wide text-field-dim">You</p>
          <input
            value={worker}
            onChange={(e) => setWorker(e.target.value)}
            placeholder="Type your name"
            className="field mt-2 w-full"
            autoCapitalize="words"
          />
        </div>
      </Shell>
    );
  }

  const back = <button type="button" className="big w-full border-2 border-field-line text-field-ink" onClick={() => setFlow(null)}>‹ Start over</button>;

  return (
    <Shell title={FLOW_TITLE[flow]} onBack={() => setFlow(null)}>
      {flow === "checkout" ? (
        <CheckoutFlow assets={assets} custody={custody} worker={worker} setWorker={setWorker} onDone={done} />
      ) : null}
      {flow === "transfer" ? (
        <TransferFlow assets={assets} custody={custody} worker={worker} setWorker={setWorker} onDone={done} />
      ) : null}
      {flow === "return" ? (
        <ReturnFlow assets={assets} custody={custody} worker={worker} setWorker={setWorker} onDone={done} />
      ) : null}
      {flow === "issue" ? (
        <IssueFlow assets={assets} custody={custody} worker={worker} setWorker={setWorker} onDone={done} />
      ) : null}
      <div className="mt-4">{back}</div>
    </Shell>
  );
}

/* ---------- data helpers ---------- */

function custodyFrom(events: EventRow[]) {
  const map = new Map<string, Custody>();
  for (const e of events) {
    if (e.type === "checkout") map.set(e.asset_id, { worker: e.worker, house: e.house });
    else if (e.type === "transfer") map.set(e.asset_id, { worker: e.to_worker, house: e.house });
    else if (e.type === "return") map.set(e.asset_id, null);
  }
  return map;
}

async function insertEvent(row: {
  asset_id: string;
  type: string;
  worker: string;
  to_worker?: string;
  house?: string;
  note?: string;
  severity?: string;
  photo_path?: string | null;
}) {
  const { error } = await supabase.from("equipment_events").insert(row);
  if (error) throw new Error(error.message);
}

async function uploadPhoto(assetCode: string, file: File) {
  const safe = assetCode.replace(/[^A-Za-z0-9-]/g, "");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${safe}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("equipment-photos").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/* ---------- flows ---------- */

type FlowProps = {
  assets: Asset[];
  custody: Map<string, Custody>;
  worker: string;
  setWorker: (n: string) => void;
  onDone: (summary: string) => Promise<void>;
};

function CheckoutFlow({ assets, custody, worker, setWorker, onDone }: FlowProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [name, setName] = useState(worker);
  const [house, setHouse] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!asset) {
    return (
      <MachinePicker
        assets={assets}
        custody={custody}
        show="all"
        worker={worker}
        onPick={setAsset}
      />
    );
  }

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      setWorker(name);
      await insertEvent({ asset_id: asset.id, type: "checkout", worker: name.trim(), house });
      await onDone(`${asset.code} is out to ${name.trim()}${house ? ` — #${house}` : ""}`);
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
      setBusy(false);
    }
  };

  return (
    <Panel>
      <MachineHead asset={asset} custody={custody.get(asset.id)} />
      <Label>Who is taking it</Label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="field w-full" placeholder="Your name" autoCapitalize="words" />
      <Label>Where is it going</Label>
      <HouseChips value={house} onChange={setHouse} />
      <ErrorNote text={err} />
      <Primary onClick={submit} busy={busy} disabled={!name.trim()}>
        Check out {asset.code}
      </Primary>
    </Panel>
  );
}

function TransferFlow({ assets, custody, worker, setWorker, onDone }: FlowProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!asset) {
    return (
      <MachinePicker
        assets={assets}
        custody={custody}
        show="out"
        worker={worker}
        onPick={setAsset}
        emptyText="Nothing is out right now."
      />
    );
  }

  const holder = custody.get(asset.id);
  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await insertEvent({
        asset_id: asset.id,
        type: "transfer",
        worker: holder?.worker || worker,
        to_worker: to.trim(),
        house: holder?.house || "",
      });
      await onDone(`${asset.code} handed to ${to.trim()}`);
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
      setBusy(false);
    }
  };

  return (
    <Panel>
      <MachineHead asset={asset} custody={holder} />
      <Label>Who is taking it over</Label>
      <input value={to} onChange={(e) => setTo(e.target.value)} className="field w-full" placeholder="New driver" autoCapitalize="words" />
      <ErrorNote text={err} />
      <Primary onClick={submit} busy={busy} disabled={!to.trim()}>
        Transfer {asset.code}
      </Primary>
    </Panel>
  );
}

function ReturnFlow({ assets, custody, worker, setWorker, onDone }: FlowProps) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [name, setName] = useState(worker);

  const mine = useMemo(
    () =>
      assets.filter((a) => {
        const c = custody.get(a.id);
        return c && (same(c.worker, name) || same(c.worker, worker));
      }),
    [assets, custody, name, worker],
  );

  if (!worker && !name.trim()) {
    return (
      <Panel>
        <Label>Your name</Label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="field w-full" placeholder="Type your name" autoCapitalize="words" />
        <Primary onClick={() => setWorker(name)} busy={false} disabled={!name.trim()}>
          Continue
        </Primary>
      </Panel>
    );
  }

  const sendReturn = async (asset: Asset, summary: string) => {
    setBusy(asset.id);
    setErr("");
    try {
      await insertEvent({ asset_id: asset.id, type: "return", worker: worker || name.trim(), house: custody.get(asset.id)?.house || "" });
      await onDone(summary);
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
      setBusy("");
    }
  };

  if (mine.length === 0) {
    return (
      <Panel>
        <p className="text-lg text-field-dim">Nothing is out to {worker || name.trim()}. Pick the machine to return.</p>
        <MachinePicker
          assets={assets}
          custody={custody}
          show="out"
          worker={worker}
          onPick={(asset) => sendReturn(asset, `${asset.code} returned`)}
          emptyText="No machines are out."
        />
        <ErrorNote text={err} />
      </Panel>
    );
  }

  const endDay = async () => {
    setBusy("all");
    setErr("");
    try {
      for (const a of mine) {
        await insertEvent({ asset_id: a.id, type: "return", worker: worker || name.trim(), house: custody.get(a.id)?.house || "" });
      }
      await onDone(`${mine.length} machine${mine.length > 1 ? "s" : ""} back — end of day logged`);
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
      setBusy("");
    }
  };

  return (
    <div>
      <p className="mb-3 text-lg text-field-dim">Out to {worker || name.trim()}:</p>
      <div className="space-y-3">
        {mine.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={busy !== ""}
            onClick={() => sendReturn(a, `${a.code} returned`)}
            className="big w-full bg-field-panel text-left text-field-ink"
          >
            <span className="block font-bold">{a.code}</span>
            <span className="block text-sm font-normal text-field-dim">{a.name}</span>
            <span className="mt-1 block text-sm font-bold uppercase text-field-caution">
              {busy === a.id ? "Returning…" : "Return this"}
            </span>
          </button>
        ))}
      </div>
      <ErrorNote text={err} />
      <Primary onClick={endDay} busy={busy === "all"} disabled={busy !== "" && busy !== "all"}>
        End my day — return all {mine.length}
      </Primary>
    </div>
  );
}

function IssueFlow({ assets, custody, worker, setWorker, onDone }: FlowProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [severity, setSeverity] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!asset) {
    return <MachinePicker assets={assets} custody={custody} show="all" worker={worker} onPick={setAsset} />;
  }

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      let photo: string | null = null;
      if (file) photo = await uploadPhoto(asset.code, file);
      await insertEvent({
        asset_id: asset.id,
        type: "issue",
        worker: worker || "unknown",
        severity,
        note: note.trim(),
        photo_path: photo,
      });
      await onDone(`${asset.code} issue sent — ${severity}`);
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
      setBusy(false);
    }
  };

  return (
    <Panel>
      <MachineHead asset={asset} custody={custody.get(asset.id)} />
      <Label>How bad is it</Label>
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "low", t: "Low", d: "still usable" },
          { k: "medium", t: "Medium", d: "slows work" },
          { k: "high", t: "High", d: "stop using" },
        ].map((o) => (
          <button
            key={o.k}
            type="button"
            onClick={() => setSeverity(o.k)}
            className={`big ${severity === o.k ? "bg-field-accent text-field-accent-ink" : "bg-field text-field-ink"}`}
          >
            <span className="block font-bold uppercase">{o.t}</span>
            <span className="block text-xs font-normal">{o.d}</span>
          </button>
        ))}
      </div>
      <Label>What is wrong</Label>
      <input value={note} onChange={(e) => setNote(e.target.value)} className="field w-full" placeholder="One line, e.g. will not start" />
      <Label>Photo (optional)</Label>
      <label className="flex min-h-14 cursor-pointer items-center justify-center border-2 border-dashed border-field-line bg-field-panel px-4 text-center text-sm font-bold uppercase text-field-ink">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? file.name : "Add photo from camera"}
      </label>

      <ErrorNote text={err} />
      <Primary onClick={submit} busy={busy} disabled={!severity}>
        Send issue
      </Primary>
    </Panel>
  );
}

/* ---------- shared bits ---------- */

function Shell({ title, children, onBack }: { title: string; children: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="min-h-screen bg-field px-4 pb-10 pt-5 text-field-ink">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-widest text-field-accent">Spacious Bay · Field</p>
          {onBack ? (
            <button type="button" onClick={onBack} className="min-h-11 px-3 text-sm font-bold uppercase text-field-dim">
              ‹ Start
            </button>
          ) : null}
        </div>
        <h1 className="mb-5 text-4xl font-bold uppercase leading-none">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="border border-field-line bg-field p-4">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 mt-4 text-sm font-bold uppercase tracking-wide text-field-dim">{children}</p>;
}

function MachinePicker({
  assets,
  custody,
  show,
  worker,
  onPick,
  emptyText,
}: {
  assets: Asset[];
  custody: Map<string, Custody>;
  show: "all" | "out" | "in";
  worker: string;
  onPick: (a: Asset) => void;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return assets.filter((a) => {
      const c = custody.get(a.id);
      if (show === "out" && !c) return false;
      if (show === "in" && c) return false;
      if (!s) return true;
      return (
        a.code.toLowerCase().includes(s) ||
        a.name.toLowerCase().includes(s) ||
        a.category.toLowerCase().includes(s) ||
        (c ? c.worker.toLowerCase().includes(s) : false)
      );
    });
  }, [assets, custody, q, show]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search machine or driver"
        className="field w-full"
      />
      <div className="mt-3 space-y-2">
        {list.map((a) => {
          const c = custody.get(a.id);
          return (
            <button key={a.id} type="button" onClick={() => onPick(a)} className="big w-full bg-field-panel text-left text-field-ink">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-bold">{a.code}</span>
                <span className={`text-xs font-bold uppercase ${c ? "text-field-caution" : "text-field-go"}`}>
                  {c ? `out to ${c.worker}` : "on site"}
                </span>
              </span>
              <span className="block text-sm font-normal text-field-dim">{a.name}</span>
            </button>
          );
        })}
        {list.length === 0 ? <p className="py-6 text-center text-field-dim">{emptyText ?? "Nothing found."}</p> : null}
      </div>
      {worker ? null : <p className="mt-3 text-sm text-field-dim">Tip: put your name on the start screen so your machines are easy to find.</p>}
    </div>
  );
}

function MachineHead({ asset, custody }: { asset: Asset; custody: Custody }) {
  return (
    <div className="border-l-4 border-field-accent bg-field-panel p-3">
      <p className="text-2xl font-bold uppercase leading-none">{asset.code}</p>
      <p className="mt-1 text-field-dim">{asset.name}</p>
      {custody ? <p className="mt-1 text-sm font-bold uppercase text-field-caution">out to {custody.worker}{custody.house ? ` · #${custody.house}` : ""}</p> : null}
    </div>
  );
}

function HouseChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {HOUSES.map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onChange(value === h ? "" : h)}
          className={`min-h-12 border text-lg font-bold ${
            value === h ? "border-field-accent bg-field-accent text-field-accent-ink" : "border-field-line bg-field text-field-ink"
          }`}
        >
          #{h}
        </button>
      ))}
    </div>
  );
}

function Primary({
  children,
  onClick,
  busy,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="big mt-5 w-full bg-field-accent text-field-accent-ink disabled:opacity-50"
    >
      {busy ? "Sending…" : children}
    </button>
  );
}

function ErrorNote({ text }: { text: string }) {
  if (!text) return null;
  return <p className="mt-4 border-2 border-field-stop bg-field-panel p-3 font-bold uppercase text-field-stop">{text}</p>;
}
