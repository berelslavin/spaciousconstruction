import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Machine } from "./equipment";

export const Route = createFileRoute("/equipment-admin")({
  head: () => ({
    meta: [
      { title: "Machine Admin — Spacious Bay" },
      { name: "description", content: "PIN-protected machine status board, transfer authorizations and issue clearance." },
      { property: "og:title", content: "Machine Admin — Spacious Bay" },
      { property: "og:description", content: "PIN-protected machine status board, transfer authorizations and issue clearance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Settings = { sheets_connected: boolean | null; sheets_url: string | null };

const FALLBACK_PIN = "2468";

function tone(status: string | null) {
  if (status === "Do Not Operate") return "border-red-600 bg-red-50";
  if (status === "Checked Out") return "border-yellow-500 bg-yellow-50";
  if (status === "Available") return "border-green-600 bg-green-50";
  return "border-orange-500 bg-orange-50";
}

function dot(status: string | null) {
  if (status === "Do Not Operate") return "bg-red-600 text-white";
  if (status === "Checked Out") return "bg-yellow-400 text-black";
  if (status === "Available") return "bg-green-600 text-white";
  return "bg-orange-500 text-white";
}

function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const tryPin = async () => {
    setPinError("");
    const { data, error } = await supabase.rpc("verify_admin_pin", { p_pin: pin });
    const ok = error ? pin === FALLBACK_PIN : data === true;
    if (ok) setUnlocked(true);
    else setPinError("Wrong PIN");
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-white px-5 py-10 text-black">
        <h1 className="text-3xl font-black">Machine Admin</h1>
        <p className="mt-2 text-lg">Enter the PIN to continue.</p>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          inputMode="numeric"
          type="password"
          placeholder="PIN"
          className="mt-5 h-16 w-full rounded-2xl border-4 border-black px-4 text-2xl font-bold"
        />
        {pinError && <p className="mt-3 text-xl font-bold text-red-600">{pinError}</p>}
        <button
          type="button"
          onClick={tryPin}
          className="mt-5 h-16 w-full rounded-2xl bg-black text-2xl font-black text-white"
        >
          Unlock
        </button>
      </div>
    );
  }

  return <AdminBoard pin={pin} />;
}

function AdminBoard({ pin }: { pin: string }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filter, setFilter] = useState<"all" | "fuel" | "issues" | "eod">("all");
  const [error, setError] = useState("");

  const load = async () => {
    const [m, o, s] = await Promise.all([
      supabase.from("machine_dashboard").select("*").order("code"),
      supabase.from("operators").select("name").eq("active", true).order("name"),
      supabase.from("app_settings_public").select("sheets_connected, sheets_url").eq("id", 1).maybeSingle(),
    ]);
    if (m.error) setError(m.error.message);
    setMachines((m.data ?? []) as Machine[]);
    setOperators((o.data ?? []).map((r: { name: string }) => r.name));
    setSettings((s.data as Settings) ?? null);
  };

  useEffect(() => {
    void load();
  }, []);

  const shown = useMemo(
    () =>
      machines.filter((m) => {
        if (filter === "fuel") return !!m.needs_fuel;
        if (filter === "issues") return !!m.open_issue;
        if (filter === "eod") return m.status === "Missing End-of-Day Confirmation";
        return true;
      }),
    [machines, filter],
  );

  const checkedOut = machines.filter((m) => m.status === "Checked Out");
  const dnoMachines = machines.filter((m) => m.status === "Do Not Operate");

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-black">
      <h1 className="text-3xl font-black">Machine Admin</h1>
      {error && <p className="mt-3 rounded-xl bg-red-600 p-3 font-bold text-white">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ["all", "All"],
          ["fuel", "Needs Fuel"],
          ["issues", "Open Issues"],
          ["eod", "Missing EOD"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`h-12 rounded-full border-2 border-black px-4 text-base font-bold ${
              filter === key ? "bg-black text-white" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {shown.map((m) => (
          <div key={m.code} className={`rounded-2xl border-4 p-4 ${tone(m.status)}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xl font-black">
                {m.code} — {m.name}
              </p>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${dot(m.status)}`}>{m.status}</span>
            </div>
            <p className="mt-1 text-base">
              {m.responsible_operator ? `With ${m.responsible_operator}` : "Unassigned"}
              {m.current_task_location ? ` · ${m.current_task_location}` : ""}
            </p>
            <p className="text-base">
              Fuel: {m.fuel_level ?? "—"}
              {m.needs_fuel ? " · NEEDS FUEL" : ""} · Return: {m.return_location ?? "—"}
            </p>
          </div>
        ))}
        {shown.length === 0 && <p className="text-lg">Nothing matches this filter.</p>}
      </div>

      <AuthorizeTransfer machines={checkedOut} operators={operators} pin={pin} onSaved={load} />
      <ClearIssue machines={dnoMachines} pin={pin} onSaved={load} />

      <section className="mt-8 rounded-2xl border-4 border-black p-4">
        <h2 className="text-xl font-black">Google Sheets</h2>
        <p className="mt-1 text-base font-bold">
          {settings?.sheets_connected ? "Google Sheets connected" : "Google Sheets not connected yet"}
        </p>
        {settings?.sheets_url && (
          <a href={settings.sheets_url} target="_blank" rel="noreferrer" className="mt-2 block break-all underline">
            {settings.sheets_url}
          </a>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-base font-bold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-14 w-full rounded-xl border-2 border-black px-3 text-lg font-bold"
      />
    </label>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="mt-3 block">
      <span className="text-base font-bold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-14 w-full rounded-xl border-2 border-black bg-white px-3 text-lg font-bold"
      >
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AuthorizeTransfer({
  machines,
  operators,
  pin,
  onSaved,
}: {
  machines: Machine[];
  operators: string[];
  pin: string;
  onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [newOperator, setNewOperator] = useState("");
  const [by, setBy] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");
    setMsg("");
    const { error } = await supabase.rpc("create_transfer_authorization", {
      p_machine_code: code,
      p_new_operator_name: newOperator,
      p_authorized_by: by.trim(),
      p_note: note.trim() || null,
      p_pin: pin,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setMsg(`Transfer of ${code} to ${newOperator} authorized.`);
      setCode("");
      setNewOperator("");
      setNote("");
      onSaved();
    }
  };

  return (
    <section className="mt-8 rounded-2xl border-4 border-black p-4">
      <h2 className="text-xl font-black">Authorize a transfer</h2>
      <Picker
        label="Checked-out machine"
        value={code}
        onChange={setCode}
        options={machines.map((m) => ({ value: m.code, label: `${m.code} — ${m.responsible_operator ?? ""}` }))}
      />
      <Picker
        label="New operator"
        value={newOperator}
        onChange={setNewOperator}
        options={operators.map((o) => ({ value: o, label: o }))}
      />
      <Field label="Authorized by" value={by} onChange={setBy} placeholder="Your name" />
      <Field label="Note (optional)" value={note} onChange={setNote} />
      {err && <p className="mt-3 font-bold text-red-600">{err}</p>}
      {msg && <p className="mt-3 font-bold text-green-700">{msg}</p>}
      <button
        type="button"
        disabled={busy || !code || !newOperator || !by.trim()}
        onClick={submit}
        className="mt-4 h-14 w-full rounded-xl bg-black text-lg font-black text-white disabled:opacity-40"
      >
        {busy ? "Saving…" : "Authorize transfer"}
      </button>
    </section>
  );
}

function ClearIssue({
  machines,
  pin,
  onSaved,
}: {
  machines: Machine[];
  pin: string;
  onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [by, setBy] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");
    setMsg("");
    const { error } = await supabase.rpc("clear_machine_issue", {
      p_machine_code: code,
      p_cleared_by: by.trim(),
      p_clear_note: note.trim(),
      p_pin: pin,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setMsg(`${code} cleared and back in service.`);
      setCode("");
      setNote("");
      onSaved();
    }
  };

  return (
    <section className="mt-8 rounded-2xl border-4 border-black p-4">
      <h2 className="text-xl font-black">Clear an issue</h2>
      <Picker
        label="Do Not Operate machine"
        value={code}
        onChange={setCode}
        options={machines.map((m) => ({ value: m.code, label: `${m.code} — ${m.name ?? ""}` }))}
      />
      <Field label="Cleared by" value={by} onChange={setBy} placeholder="Your name" />
      <Field label="Clearance note" value={note} onChange={setNote} placeholder="What was fixed" />
      {err && <p className="mt-3 font-bold text-red-600">{err}</p>}
      {msg && <p className="mt-3 font-bold text-green-700">{msg}</p>}
      <button
        type="button"
        disabled={busy || !code || !by.trim() || !note.trim()}
        onClick={submit}
        className="mt-4 h-14 w-full rounded-xl bg-black text-lg font-black text-white disabled:opacity-40"
      >
        {busy ? "Saving…" : "Clear issue"}
      </button>
    </section>
  );
}
