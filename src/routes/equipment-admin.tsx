import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  S_DNO,
  S_EOD,
  fmtDate,
  fmtTime,
  loadMachines,
  rpcError,
  shortStatus,
  statusTone,
  useOnline,
  type Machine,
} from "@/lib/equipment";

export const Route = createFileRoute("/equipment-admin")({
  head: () => ({
    meta: [
      { title: "Machine Admin — Spacious Bay" },
      {
        name: "description",
        content:
          "PIN-protected machine control center: live status, machines, activity, operators, transfers and issues.",
      },
      { property: "og:title", content: "Machine Admin — Spacious Bay" },
      {
        property: "og:description",
        content: "PIN-protected machine control center for Spacious Bay Construction.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#15181c" },
    ],
  }),
  component: AdminPage,
});

const NULL_ID = null as unknown as string;

/* ---------------- shared UI ---------------- */

const inputCls =
  "min-h-[56px] w-full rounded-xl border-2 border-field-line bg-field-panel px-3 text-lg font-bold text-field-ink placeholder:text-field-dim";
const btnCls = "min-h-[56px] rounded-xl px-4 text-lg font-black disabled:opacity-35";
const primaryBtn = `${btnCls} bg-field-accent text-field-accent-ink`;
const ghostBtn = `${btnCls} border-2 border-field-line`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-field-dim">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border-2 border-field-line bg-field-panel p-4 ${className}`}>
      {children}
    </div>
  );
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl font-black">{children}</h2>;
}

function Msg({ err, ok }: { err?: string; ok?: string }) {
  if (err)
    return <p className="rounded-xl bg-field-stop p-3 text-base font-bold text-field-ink">{err}</p>;
  if (ok)
    return (
      <p className="rounded-xl bg-field-go p-3 text-base font-bold text-field-accent-ink">{ok}</p>
    );
  return null;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[56px] shrink-0 rounded-full border-2 px-4 text-base font-bold ${
        active ? "border-field-accent bg-field-accent text-field-accent-ink" : "border-field-line"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ status }: { status: string | null }) {
  return (
    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black ${statusTone(status)}`}>
      {shortStatus(status)}
    </span>
  );
}

function Photo({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 block w-28">
      <img
        src={url}
        alt="Photo"
        loading="lazy"
        className="h-20 w-28 rounded-lg border-2 border-field-line object-cover"
      />
    </a>
  );
}

/* ---------------- PIN gate ---------------- */

function AdminPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const tryPin = async () => {
    setErr("");
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_admin_pin", { p_pin: pin });
    setBusy(false);
    if (error) setErr("Service error — could not verify PIN. Admin stays locked. Try again.");
    else if (data === true) setUnlocked(true);
    else setErr("Wrong PIN");
  };

  if (unlocked) return <AdminApp pin={pin} />;

  return (
    <div
      className="min-h-screen px-5 text-field-ink"
      style={{ paddingTop: "max(env(safe-area-inset-top), 2.5rem)" }}
    >
      <p className="text-sm font-bold uppercase tracking-widest text-field-dim">Spacious Bay</p>
      <h1 className="text-4xl font-black">Machine Admin</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void tryPin();
        }}
      >
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          inputMode="numeric"
          type="password"
          autoComplete="off"
          placeholder="PIN"
          aria-label="Admin PIN"
          className="min-h-[64px] w-full rounded-2xl border-4 border-field-line bg-field-panel px-4 text-3xl font-black tracking-widest text-field-ink placeholder:text-field-dim"
        />
        <Msg err={err} />
        <button
          type="submit"
          disabled={!pin || busy}
          className="min-h-[64px] w-full rounded-2xl bg-field-accent text-2xl font-black text-field-accent-ink disabled:opacity-35"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

/* ---------------- App shell ---------------- */

type Tab = "live" | "machines" | "activity" | "operators" | "transfer" | "issues";
const TABS: [Tab, string][] = [
  ["live", "Live"],
  ["machines", "Machines"],
  ["activity", "Activity"],
  ["operators", "Operators"],
  ["transfer", "Transfers"],
  ["issues", "Issues"],
];

type Op = { id: string; name: string; active: boolean; custody_count: number };

function AdminApp({ pin }: { pin: string }) {
  const [tab, setTab] = useState<Tab>("live");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [ops, setOps] = useState<Op[]>([]);
  const [refreshed, setRefreshed] = useState<Date | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const online = useOnline();

  const refresh = useCallback(async () => {
    const [m, o] = await Promise.all([
      loadMachines(),
      supabase.rpc("admin_operators", { p_pin: pin }),
    ]);
    if (m.error || o.error) {
      setLoadErr("Could not refresh — check connection.");
      return;
    }
    setLoadErr("");
    setMachines((m.data ?? []) as Machine[]);
    setOps((o.data ?? []) as Op[]);
    setRefreshed(new Date());
  }, [pin]);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const activeOps = ops.filter((o) => o.active).map((o) => o.name);

  return (
    <div
      className="min-h-screen text-field-ink"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
    >
      <div
        className="sticky top-0 z-10 border-b-2 border-field-line bg-field px-4 pb-2"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-black">Machine Admin</h1>
            <Link to="/today" className="text-sm font-bold text-field-dim underline underline-offset-4">
              Schedule &amp; more
            </Link>
          </div>
          <span className="flex items-center gap-2 text-sm font-bold">
            <span
              className={`h-3 w-3 rounded-full ${online && !loadErr ? "bg-field-go" : "bg-field-stop"}`}
              aria-hidden
            />
            {online && !loadErr ? "Live" : "Offline"}
            <span className="text-field-dim">
              {refreshed
                ? refreshed.toLocaleTimeString("en-US", {
                    timeZone: "America/Chicago",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "…"}
            </span>
          </span>
        </div>
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
          {TABS.map(([k, l]) => (
            <Chip key={k} active={tab === k} onClick={() => setTab(k)}>
              {l}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-4 px-4 pt-4">
        {loadErr && <Msg err={loadErr} />}
        {tab === "live" && <Live machines={machines} pin={pin} />}
        {tab === "machines" && <Machines pin={pin} onSaved={refresh} />}
        {tab === "activity" && <Activity pin={pin} machines={machines} />}
        {tab === "operators" && <Operators pin={pin} ops={ops} onSaved={refresh} />}
        {tab === "transfer" && (
          <Transfers pin={pin} machines={machines} operators={activeOps} onSaved={refresh} />
        )}
        {tab === "issues" && <Issues pin={pin} onSaved={refresh} />}
      </div>
    </div>
  );
}

/* ---------------- Live ---------------- */

type LiveFilter = "all" | "out" | "eod" | "dno" | "fuel" | "due";

function Live({ machines, pin }: { machines: Machine[]; pin: string }) {
  const [filter, setFilter] = useState<LiveFilter>("all");
  const [sheets, setSheets] = useState<{
    sheets_connected?: boolean;
    sheets_url?: string | null;
  } | null>(null);

  useEffect(() => {
    void supabase
      .rpc("admin_settings", { p_pin: pin })
      .then(({ data }) => setSheets((data as typeof sheets) ?? null));
  }, [pin]);

  const counts = {
    all: machines.length,
    out: machines.filter((m) => !!m.responsible_operator).length,
    eod: machines.filter((m) => !!m.eod_missing).length,
    dno: machines.filter((m) => !!m.do_not_operate).length,
    fuel: machines.filter((m) => m.fuel_level === "Needs Fuel").length,
    due: machines.filter((m) => !m.fuel_logged_today).length,
  };
  const test = (m: Machine) =>
    filter === "out"
      ? !!m.responsible_operator
      : filter === "eod"
        ? !!m.eod_missing
        : filter === "dno"
          ? !!m.do_not_operate
          : filter === "fuel"
            ? m.fuel_level === "Needs Fuel"
            : filter === "due"
              ? !m.fuel_logged_today
              : true;
  const shown = machines.filter(test);

  const tiles: [LiveFilter, string, number, string][] = [
    ["all", "Total active", counts.all, ""],
    ["out", "Checked out", counts.out, "text-field-caution"],
    ["eod", "Missing EOD", counts.eod, "text-field-eod"],
    ["dno", "Do Not Operate", counts.dno, "text-field-stop"],
    ["fuel", "Needs fuel", counts.fuel, "text-field-accent"],
    ["due", "Fuel reading due", counts.due, "text-field-dim"],
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([k, l, n, c]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={`min-h-[76px] rounded-xl border-2 p-2 text-left ${filter === k ? "border-field-accent bg-field-panel" : "border-field-line"}`}
          >
            <span className={`block text-3xl font-black leading-none ${c}`}>{n}</span>
            <span className="mt-1 block text-xs font-bold leading-tight">{l}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-field-dim">
        "Needs fuel" = reading was Needs Fuel. "Fuel reading due" = no reading logged yet today.
      </p>
      <div className="space-y-3">
        {shown.map((m) => (
          <Card key={m.code} className={m.status === S_DNO ? "border-field-stop" : ""}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xl font-black leading-tight">
                {m.code} <span className="font-bold">{m.name}</span>
              </p>
              <Badge status={m.status} />
            </div>
            <p className="mt-1 text-base font-bold">
              {m.responsible_operator ? `With ${m.responsible_operator}` : "Not in custody"}
              {m.current_task_location ? ` · ${m.current_task_location}` : ""}
            </p>
            {m.open_issue && (
              <p className="mt-1 text-base font-bold text-field-stop">
                Issue{(m.open_issue_count ?? 0) > 1 ? ` (${m.open_issue_count})` : ""}:{" "}
                {m.open_issue}
              </p>
            )}
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-field-dim">Fuel</dt>
              <dd className="font-bold">
                {m.fuel_level ?? "—"}{" "}
                {m.fuel_logged_today ? (
                  "· logged today"
                ) : (
                  <span className="text-field-eod">· due today</span>
                )}
              </dd>
              <dt className="text-field-dim">Return to</dt>
              <dd className="font-bold">{m.return_location ?? "—"}</dd>
              <dt className="text-field-dim">Last activity</dt>
              <dd className="font-bold">
                {m.last_activity_type ?? "—"}{" "}
                {m.last_activity_at ? `· ${fmtTime(m.last_activity_at)}` : ""}
              </dd>
              <dt className="text-field-dim">Last EOD</dt>
              <dd className="font-bold">{fmtDate(m.last_eod_date)}</dd>
            </dl>
          </Card>
        ))}
        {shown.length === 0 && (
          <p className="text-lg text-field-dim">Nothing matches this filter.</p>
        )}
      </div>
      <Card>
        <H2>Google Sheets</H2>
        <p className="mt-1 text-base font-bold">
          {sheets?.sheets_connected ? "Google Sheets connected" : "Google Sheets not connected yet"}
        </p>
        {sheets?.sheets_url && (
          <a
            href={sheets.sheets_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all text-sm underline"
          >
            {sheets.sheets_url}
          </a>
        )}
      </Card>
    </>
  );
}

/* ---------------- Machines ---------------- */

type AdminMachine = {
  id: string;
  code: string;
  name: string;
  return_location: string;
  active: boolean;
  do_not_operate: boolean;
  responsible_operator: string | null;
  eod_missing: boolean;
  open_issue_count: number;
};

function Machines({ pin, onSaved }: { pin: string; onSaved: () => void }) {
  const [list, setList] = useState<AdminMachine[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_machines", { p_pin: pin });
    if (error) setErr(rpcError(error));
    else setList((data ?? []) as AdminMachine[]);
  }, [pin]);
  useEffect(() => {
    void load();
  }, [load]);

  const saved = () => {
    setEditing(null);
    void load();
    onSaved();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <H2>Machines</H2>
        <button type="button" className={ghostBtn} onClick={() => setEditing("new")}>
          + Add
        </button>
      </div>
      <Msg err={err} />
      {editing === "new" && (
        <MachineForm pin={pin} onDone={saved} onCancel={() => setEditing(null)} />
      )}
      {list.map((m) =>
        editing === m.id ? (
          <MachineForm
            key={m.id}
            pin={pin}
            machine={m}
            onDone={saved}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <Card key={m.id} className={m.active ? "" : "opacity-60"}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xl font-black">
                  {m.code} <span className="font-bold">{m.name}</span>
                </p>
                <p className="text-base">Return: {m.return_location}</p>
                <p className="text-sm text-field-dim">
                  {m.active ? "Active" : "Inactive — hidden from workers"}
                  {m.responsible_operator ? ` · with ${m.responsible_operator}` : ""}
                  {m.do_not_operate ? " · DNO" : ""}
                  {m.eod_missing ? " · Missing EOD" : ""}
                </p>
              </div>
              <button type="button" className={ghostBtn} onClick={() => setEditing(m.id)}>
                Edit
              </button>
            </div>
          </Card>
        ),
      )}
    </>
  );
}

function MachineForm({
  pin,
  machine,
  onDone,
  onCancel,
}: {
  pin: string;
  machine?: AdminMachine;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(machine?.code ?? "");
  const [name, setName] = useState(machine?.name ?? "");
  const [loc, setLoc] = useState(machine?.return_location ?? "Equipment Bay 1");
  const [active, setActive] = useState(machine?.active ?? true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const deactivateReason = machine?.responsible_operator
    ? `In custody with ${machine.responsible_operator}. Return it first.`
    : machine?.do_not_operate || (machine?.open_issue_count ?? 0) > 0
      ? "Unresolved safety issue. Clear all issues first."
      : machine?.eod_missing
        ? "Missing EOD. Complete Return / end-of-day first."
        : "";

  const save = async () => {
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc("admin_save_machine", {
      p_pin: pin,
      p_id: machine?.id ?? NULL_ID,
      p_code: code,
      p_name: name,
      p_return_location: loc,
      p_active: active,
    });
    setBusy(false);
    if (error) setErr(rpcError(error));
    else onDone();
  };

  return (
    <Card className="space-y-3 border-field-accent">
      <p className="text-lg font-black">{machine ? `Edit ${machine.code}` : "New machine"}</p>
      <Field label="Code">
        <input
          className={inputCls}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="EX-111"
        />
      </Field>
      <Field label="Name">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Excavator"
        />
      </Field>
      <Field label="Designated return location">
        <input className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Chip active={active} onClick={() => setActive(true)}>
          Active
        </Chip>
        <Chip active={!active} onClick={() => setActive(false)}>
          Inactive
        </Chip>
      </div>
      {machine?.active && !active && deactivateReason && (
        <Msg err={`Cannot deactivate: ${deactivateReason}`} />
      )}
      <Msg err={err} />
      <div className="flex gap-2">
        <button
          type="button"
          className={`${primaryBtn} flex-1`}
          disabled={
            busy ||
            !code.trim() ||
            !name.trim() ||
            !loc.trim() ||
            (!!machine?.active && !active && !!deactivateReason)
          }
          onClick={save}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className={ghostBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

/* ---------------- Activity ---------------- */

type Act = {
  id: string;
  created_at: string;
  machine_code: string;
  machine_name: string;
  type: string;
  operator: string | null;
  from_operator: string | null;
  to_operator: string | null;
  task_location: string | null;
  fuel_level: string | null;
  note: string | null;
  photo_url: string | null;
};
const ACTION_LABEL: Record<string, string> = {
  checkout: "Check out",
  transfer: "Transfer",
  return: "Return / EOD",
  issue: "Issue",
  clear: "Issue cleared",
};

function Activity({ pin, machines }: { pin: string; machines: Machine[] }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState("");
  const [today, setToday] = useState(true);
  const [rows, setRows] = useState<Act[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    void supabase
      .rpc("admin_activity", {
        p_pin: pin,
        p_machine_code: code,
        p_type: type,
        p_today_only: today,
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setErr(rpcError(error));
        else {
          setErr("");
          setRows((data ?? []) as Act[]);
        }
      });
    return () => {
      live = false;
    };
  }, [pin, code, type, today]);

  return (
    <>
      <H2>Activity log</H2>
      <div className="grid grid-cols-2 gap-2">
        <select
          className={inputCls}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Machine"
        >
          <option value="">All machines</option>
          {machines.map((m) => (
            <option key={m.code} value={m.code}>
              {m.code}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Action"
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Chip active={today} onClick={() => setToday(true)}>
          Today
        </Chip>
        <Chip active={!today} onClick={() => setToday(false)}>
          All
        </Chip>
      </div>
      <Msg err={err} />
      {rows === null && <p className="text-field-dim">Loading…</p>}
      {rows?.length === 0 && <p className="text-lg text-field-dim">No activity for this filter.</p>}
      {rows?.map((a) => (
        <Card key={a.id}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-black">
              {a.machine_code} · {ACTION_LABEL[a.type] ?? a.type}
            </p>
            <span className="shrink-0 text-sm text-field-dim">{fmtTime(a.created_at)}</span>
          </div>
          <p className="text-base font-bold">
            {a.type === "transfer"
              ? `${a.from_operator ?? "?"} → ${a.to_operator ?? "?"}`
              : (a.operator ?? "")}
          </p>
          {a.task_location && <p className="text-base">📍 {a.task_location}</p>}
          {a.fuel_level && <p className="text-base">Fuel: {a.fuel_level}</p>}
          {a.note && <p className="text-base text-field-dim">{a.note}</p>}
          <Photo url={a.photo_url} />
        </Card>
      ))}
    </>
  );
}

/* ---------------- Operators ---------------- */

function Operators({ pin, ops, onSaved }: { pin: string; ops: Op[]; onSaved: () => void }) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (id: string | null, name: string, active: boolean) => {
    setBusy(true);
    setErr("");
    setOk("");
    const { error } = await supabase.rpc("admin_save_operator", {
      p_pin: pin,
      p_id: id ?? NULL_ID,
      p_name: name,
      p_active: active,
    });
    setBusy(false);
    if (error) setErr(rpcError(error));
    else {
      setOk(id ? "Saved." : `${name.trim()} added.`);
      setEditing(null);
      setNewName("");
      onSaved();
    }
  };

  return (
    <>
      <H2>Authorized operators</H2>
      <Card className="space-y-2">
        <Field label="Add operator">
          <input
            className={inputCls}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full name"
          />
        </Field>
        <button
          type="button"
          className={`${primaryBtn} w-full`}
          disabled={busy || !newName.trim()}
          onClick={() => save(null, newName, true)}
        >
          Add operator
        </button>
      </Card>
      <Msg err={err} ok={ok} />
      {ops.map((o) => (
        <Card key={o.id} className={o.active ? "" : "opacity-60"}>
          {editing === o.id ? (
            <div className="space-y-2">
              <input
                className={inputCls}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Operator name"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`${primaryBtn} flex-1`}
                  disabled={busy || !draft.trim()}
                  onClick={() => save(o.id, draft, o.active)}
                >
                  Save name
                </button>
                <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="break-words text-xl font-black">{o.name}</p>
                <p className="text-sm text-field-dim">
                  {o.active ? "Active" : "Inactive"}
                  {o.custody_count > 0
                    ? ` · has ${o.custody_count} machine${o.custody_count > 1 ? "s" : ""}`
                    : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => {
                    setEditing(o.id);
                    setDraft(o.name);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={busy || (o.active && o.custody_count > 0)}
                  title={o.active && o.custody_count > 0 ? "Has custody of a machine" : ""}
                  onClick={() => save(o.id, o.name, !o.active)}
                >
                  {o.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}

/* ---------------- Transfers ---------------- */

type Auth = {
  id: string;
  code: string;
  machine_code: string;
  from_operator: string;
  to_operator: string;
  authorized_by: string;
  note: string | null;
  valid_date: string;
  used_at: string | null;
  created_at: string;
  state: string;
};

function Transfers({
  pin,
  machines,
  operators,
  onSaved,
}: {
  pin: string;
  machines: Machine[];
  operators: string[];
  onSaved: () => void;
}) {
  const held = machines.filter((m) => !!m.responsible_operator);
  const [code, setCode] = useState("");
  const [to, setTo] = useState("");
  const [by, setBy] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [auths, setAuths] = useState<Auth[]>([]);

  const machine = held.find((m) => m.code === code) ?? null;
  const dno = !!machine?.do_not_operate;
  const eodBlocked = !dno && !!machine?.eod_missing;
  const eligible = !!machine && !dno && !eodBlocked;

  const loadAuths = useCallback(async () => {
    const { data } = await supabase.rpc("admin_authorizations", { p_pin: pin });
    setAuths((data ?? []) as Auth[]);
  }, [pin]);
  useEffect(() => {
    void loadAuths();
  }, [loadAuths]);

  const submit = async () => {
    setBusy(true);
    setErr("");
    setOk("");
    const { error } = await supabase.rpc("create_transfer_authorization", {
      p_pin: pin,
      p_machine_code: code,
      p_new_operator_name: to,
      p_authorized_by: by.trim(),
      ...(note.trim() ? { p_note: note.trim() } : {}),
    });
    setBusy(false);
    if (error) setErr(rpcError(error));
    else {
      setOk(
        `Approved: ${code} from ${machine?.responsible_operator} → ${to}. Valid today only, one use.`,
      );
      setCode("");
      setTo("");
      setNote("");
      void loadAuths();
      onSaved();
    }
  };

  const stateTone: Record<string, string> = {
    valid: "bg-field-go text-field-accent-ink",
    used: "bg-field-line text-field-ink",
    expired: "bg-field-line text-field-dim",
    void: "bg-field-line text-field-dim",
  };

  return (
    <>
      <H2>Transfer authorization</H2>
      <Card className="space-y-3">
        <Field label="Machine in custody">
          <select
            className={inputCls}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setTo("");
            }}
          >
            <option value="">{held.length ? "Choose…" : "No machines in custody"}</option>
            {held.map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} — {m.responsible_operator}
                {m.do_not_operate ? " — DNO" : m.eod_missing ? " — Missing EOD" : ""}
              </option>
            ))}
          </select>
        </Field>
        {machine && (
          <>
            <p className="text-base">
              Current operator: <b>{machine.responsible_operator}</b>
            </p>
            {dno && (
              <Msg err="Do Not Operate — clear all open issues before authorizing a transfer." />
            )}
            {eodBlocked && (
              <p className="rounded-xl bg-field-eod p-3 text-base font-bold text-field-accent-ink">
                End-of-day is missing. Return / end-of-day is required before authorizing a
                transfer.
              </p>
            )}
          </>
        )}
        {eligible && (
          <Field label="New responsible operator">
            <select className={inputCls} value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Choose…</option>
              {operators
                .filter((o) => o !== machine?.responsible_operator)
                .map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
            </select>
          </Field>
        )}
        {eligible && (
          <Field label="Authorized by">
            <input
              className={inputCls}
              value={by}
              onChange={(e) => setBy(e.target.value)}
              placeholder="Your name"
            />
          </Field>
        )}
        {eligible && (
          <Field label="Note (optional)">
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        {eligible && (
          <p className="text-sm font-bold text-field-accent">
            Valid today only (America/Chicago) · one use
          </p>
        )}
        <Msg err={err} ok={ok} />
        {eligible && (
          <button
            type="button"
            className={`${primaryBtn} w-full`}
            disabled={busy || !to || !by.trim()}
            onClick={submit}
          >
            {busy ? "Saving…" : "Approve transfer"}
          </button>
        )}
      </Card>
      <p className="pt-2 text-lg font-black">Recent authorizations</p>
      {auths.length === 0 && <p className="text-field-dim">None yet.</p>}
      {auths.map((a) => (
        <Card key={a.id}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-black">
              {a.machine_code}: {a.from_operator} → {a.to_operator}
            </p>
            <span
              className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black uppercase ${stateTone[a.state] ?? ""}`}
            >
              {a.state}
            </span>
          </div>
          <p className="text-sm text-field-dim">
            By {a.authorized_by} · for {fmtDate(a.valid_date)}
            {a.used_at ? ` · used ${fmtTime(a.used_at)}` : ""}
          </p>
          {a.note && <p className="text-sm">{a.note}</p>}
        </Card>
      ))}
    </>
  );
}

/* ---------------- Issues ---------------- */

type Issue = {
  id: string;
  machine_code: string;
  machine_name: string;
  reporter: string | null;
  description: string;
  photo_url: string | null;
  status: string;
  created_at: string;
  cleared_by: string | null;
  cleared_at: string | null;
  clear_note: string | null;
};

function Issues({ pin, onSaved }: { pin: string; onSaved: () => void }) {
  const [rows, setRows] = useState<Issue[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_issues", { p_pin: pin });
    if (error) setErr(rpcError(error));
    else setRows((data ?? []) as Issue[]);
  }, [pin]);
  useEffect(() => {
    void load();
  }, [load]);

  const open = rows.filter((r) => r.status === "open");
  const cleared = rows.filter((r) => r.status !== "open").slice(0, 30);
  const byMachine = useMemo(() => {
    const map = new Map<string, Issue[]>();
    open.forEach((i) => map.set(i.machine_code, [...(map.get(i.machine_code) ?? []), i]));
    return [...map.entries()];
  }, [open]);

  return (
    <>
      <H2>Issues / Do Not Operate</H2>
      <Msg err={err} />
      {byMachine.length === 0 && (
        <p className="text-lg text-field-dim">No open issues. Every machine is cleared.</p>
      )}
      {byMachine.map(([code, list]) => (
        <ClearBox
          key={code}
          code={code}
          issues={list}
          pin={pin}
          onDone={() => {
            void load();
            onSaved();
          }}
        />
      ))}
      <p className="pt-2 text-lg font-black">Recently cleared</p>
      {cleared.length === 0 && <p className="text-field-dim">None yet.</p>}
      {cleared.map((i) => (
        <Card key={i.id} className="opacity-80">
          <p className="text-base font-black">
            {i.machine_code} · {i.description}
          </p>
          <p className="text-sm text-field-dim">
            Reported {fmtTime(i.created_at)} by {i.reporter ?? "?"} · cleared{" "}
            {fmtTime(i.cleared_at)} by {i.cleared_by}
          </p>
          <p className="text-sm">Fix: {i.clear_note}</p>
        </Card>
      ))}
    </>
  );
}

function ClearBox({
  code,
  issues,
  pin,
  onDone,
}: {
  code: string;
  issues: Issue[];
  pin: string;
  onDone: () => void;
}) {
  const [sel, setSel] = useState<string[]>(issues.length === 1 ? [issues[0]?.id ?? ""] : []);
  const [by, setBy] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const all = sel.length === issues.length;

  const submit = async () => {
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc("clear_machine_issues", {
      p_pin: pin,
      p_issue_ids: sel,
      p_cleared_by: by.trim(),
      p_clear_note: note.trim(),
    });
    setBusy(false);
    if (error) setErr(rpcError(error));
    else onDone();
  };

  return (
    <Card className="space-y-3 border-field-stop">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xl font-black">
          {code} <span className="font-bold">{issues[0]?.machine_name}</span>
        </p>
        <Badge status={S_DNO} />
      </div>
      {issues.map((i) => {
        const on = sel.includes(i.id);
        return (
          <button
            key={i.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => setSel(on ? sel.filter((x) => x !== i.id) : [...sel, i.id])}
            className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left ${on ? "border-field-accent" : "border-field-line"}`}
          >
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 font-black ${on ? "border-field-accent bg-field-accent text-field-accent-ink" : "border-field-dim"}`}
            >
              {on ? "✓" : ""}
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold">{i.description}</span>
              <span className="block text-sm text-field-dim">
                {i.reporter ?? "?"} · {fmtTime(i.created_at)}
              </span>
              <Photo url={i.photo_url} />
            </span>
          </button>
        );
      })}
      <input
        className={inputCls}
        value={by}
        onChange={(e) => setBy(e.target.value)}
        placeholder="Cleared by (your name)"
        aria-label="Cleared by"
      />
      <input
        className={inputCls}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What was fixed (required)"
        aria-label="Clearance note"
      />
      {sel.length > 0 && (
        <p className={`text-base font-bold ${all ? "text-field-go" : "text-field-eod"}`}>
          {all
            ? `All ${issues.length} open issue${issues.length > 1 ? "s" : ""} selected — ${code} returns to service.`
            : `${sel.length} of ${issues.length} selected — ${code} stays Do Not Operate.`}
        </p>
      )}
      <Msg err={err} />
      <button
        type="button"
        className={`${primaryBtn} w-full`}
        disabled={busy || sel.length === 0 || !by.trim() || !note.trim()}
        onClick={submit}
      >
        {busy ? "Saving…" : `Clear ${sel.length || ""} issue${sel.length === 1 ? "" : "s"}`}
      </button>
    </Card>
  );
}
