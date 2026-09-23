import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Spacious Bay Field — Machines" },
      { name: "description", content: "Check out, transfer, return or report a machine in a few taps." },
      { property: "og:title", content: "Spacious Bay Field — Machines" },
      { property: "og:description", content: "Check out, transfer, return or report a machine in a few taps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FieldPage,
});

type Flow = "checkout" | "transfer" | "return" | "issue";

export type Machine = {
  code: string;
  name: string | null;
  return_location: string | null;
  status: string | null;
  responsible_operator: string | null;
  current_task_location: string | null;
  fuel_level: string | null;
  fuel_logged_date: string | null;
  open_issue: boolean | null;
  needs_fuel: boolean | null;
};

const FUEL = ["Full", "¾", "½", "¼", "Needs Fuel"];

export function todayChicago() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

function fuelNeeded(m: Machine) {
  return (m.fuel_logged_date ?? "") !== todayChicago();
}

function statusTone(status: string | null) {
  if (status === "Do Not Operate") return "bg-field-stop text-white";
  if (status === "Checked Out") return "bg-field-caution text-black";
  if (status === "Available") return "bg-field-go text-white";
  return "bg-orange-500 text-white";
}

function FieldPage() {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    setLoading(true);
    const [mRes, oRes] = await Promise.all([
      supabase.from("machine_dashboard").select("*").order("code"),
      supabase.from("operators").select("name").eq("active", true).order("name"),
    ]);
    if (mRes.error || oRes.error) setLoadError(mRes.error?.message ?? oRes.error?.message ?? "");
    else {
      setLoadError("");
      setMachines((mRes.data ?? []) as Machine[]);
      setOperators((oRes.data ?? []).map((o: { name: string }) => o.name));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const done = () => {
    setFlow(null);
    void load();
  };

  return (
    <div className="min-h-screen bg-field text-field-ink px-4 py-6">
      <p className="text-sm font-bold uppercase tracking-widest opacity-70">Spacious Bay Field</p>

      {loadError && (
        <p className="mt-4 rounded-xl bg-field-stop p-4 text-base font-bold text-white">{loadError}</p>
      )}

      {flow === null && (
        <>
          <h1 className="mt-2 text-4xl font-black leading-tight">What are you doing?</h1>
          <div className="mt-6 space-y-4">
            <HomeButton label="Check out machine" onClick={() => setFlow("checkout")} />
            <HomeButton label="Transfer machine" onClick={() => setFlow("transfer")} />
            <HomeButton label="Return machine / end-of-day" onClick={() => setFlow("return")} />
            <HomeButton label="Report issue" onClick={() => setFlow("issue")} />
          </div>
          {loading && <p className="mt-6 text-lg opacity-70">Loading machines…</p>}
        </>
      )}

      {flow === "checkout" && (
        <Checkout machines={machines} operators={operators} onDone={done} onBack={() => setFlow(null)} />
      )}
      {flow === "transfer" && (
        <Transfer machines={machines} operators={operators} onDone={done} onBack={() => setFlow(null)} />
      )}
      {flow === "return" && (
        <ReturnEod machines={machines} operators={operators} onDone={done} onBack={() => setFlow(null)} />
      )}
      {flow === "issue" && (
        <ReportIssue machines={machines} operators={operators} onDone={done} onBack={() => setFlow(null)} />
      )}
    </div>
  );
}

function HomeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="big w-full rounded-2xl bg-field-accent px-5 text-left text-3xl font-black text-field-accent-ink"
    >
      {label}
    </button>
  );
}

function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-10">
      <button type="button" onClick={onBack} className="field mt-2 text-xl font-bold underline">
        ← Back
      </button>
      <h1 className="mt-2 text-3xl font-black">{title}</h1>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xl font-bold">{children}</p>;
}

function MachinePicker({
  machines,
  value,
  onChange,
}: {
  machines: Machine[];
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>Machine</Label>
      {machines.length === 0 && <p className="text-lg opacity-70">No machines available for this step.</p>}
      {machines.map((m) => (
        <button
          key={m.code}
          type="button"
          onClick={() => onChange(m.code)}
          className={`field w-full rounded-2xl border-4 px-4 text-left ${
            value === m.code ? "border-field-accent bg-white/10" : "border-field-line"
          }`}
        >
          <span className="block text-2xl font-black">
            {m.code} — {m.name}
          </span>
          <span className={`mt-1 inline-block rounded-lg px-2 py-1 text-sm font-bold ${statusTone(m.status)}`}>
            {m.status}
          </span>
          {m.responsible_operator && (
            <span className="ml-2 text-base font-bold">with {m.responsible_operator}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function OperatorPicker({
  operators,
  value,
  onChange,
  label,
}: {
  operators: string[];
  value: string;
  onChange: (name: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field w-full rounded-2xl border-4 border-field-line bg-field px-4 text-2xl font-bold text-field-ink"
      >
        <option value="">Choose a person…</option>
        {operators.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function FuelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <Label>Fuel level (required today)</Label>
      <div className="grid grid-cols-2 gap-3">
        {FUEL.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            className={`field rounded-2xl border-4 text-2xl font-black ${
              value === f ? "border-field-accent bg-field-accent text-field-accent-ink" : "border-field-line"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`field w-full rounded-2xl border-4 px-4 text-left text-xl font-bold ${
        checked ? "border-field-go bg-field-go text-white" : "border-field-line"
      }`}
    >
      <span className="mr-3 text-2xl">{checked ? "☑" : "☐"}</span>
      {label}
    </button>
  );
}

function Submit({
  disabled,
  busy,
  label,
  onClick,
}: {
  disabled: boolean;
  busy: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className="big w-full rounded-2xl bg-field-accent text-3xl font-black text-field-accent-ink disabled:opacity-40"
    >
      {busy ? "Saving…" : label}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return <p className="rounded-2xl bg-field-stop p-4 text-xl font-bold text-white">{message}</p>;
}

function Confirmation({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  return (
    <div className="pb-10">
      <h1 className="mt-6 text-4xl font-black text-field-go">Saved</h1>
      <div className="mt-4 space-y-2 text-2xl font-bold">
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="big mt-8 w-full rounded-2xl bg-field-accent text-3xl font-black text-field-accent-ink"
      >
        Done
      </button>
    </div>
  );
}

function PhotoInput({
  file,
  onPick,
}: {
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="space-y-3">
      <Label>Photo (required)</Label>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="field w-full rounded-2xl border-4 border-field-line text-2xl font-black"
      >
        {file ? "Retake photo" : "Take photo"}
      </button>
      {preview && <img src={preview} alt="Photo preview" className="w-full rounded-2xl border-4 border-field-line" />}
    </div>
  );
}

async function uploadPhoto(code: string, file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${code}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("equipment-photos").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("equipment-photos").getPublicUrl(path).data.publicUrl;
}

function rpcError(error: { message: string } | null) {
  return error ? error.message.replace(/^.*?:\s*/, "") : "";
}

/* ---------------- Checkout ---------------- */

function Checkout({
  machines,
  operators,
  onDone,
  onBack,
}: {
  machines: Machine[];
  operators: string[];
  onDone: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [operator, setOperator] = useState("");
  const [task, setTask] = useState("");
  const [safe, setSafe] = useState(false);
  const [fuel, setFuel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[] | null>(null);

  const machine = useMemo(() => machines.find((m) => m.code === code) ?? null, [machines, code]);
  const blocked =
    machine?.status === "Do Not Operate"
      ? "Do Not Operate — this machine cannot be checked out."
      : machine?.status === "Checked Out"
        ? `Already checked out to ${machine.responsible_operator ?? "someone"}.`
        : machine?.status === "Missing End-of-Day Confirmation"
          ? "End-of-day is missing for this machine. Use Return machine / end-of-day first."
          : "";
  const needFuel = machine ? fuelNeeded(machine) : false;
  const ready = !!machine && !blocked && !!operator && task.trim().length > 0 && safe && (!needFuel || !!fuel);

  if (saved) return <Confirmation lines={saved} onDone={onDone} />;

  const submit = async () => {
    setBusy(true);
    setError("");
    const { error: e } = await supabase.rpc("checkout_machine", {
      p_machine_code: code,
      p_operator_name: operator,
      p_task_location: task.trim(),
      p_safe_confirmed: safe,
      p_fuel_level: needFuel ? fuel : undefined,
    });
    setBusy(false);
    if (e) setError(rpcError(e));
    else setSaved([`${code} checked out`, `Operator: ${operator}`, `Task: ${task.trim()}`]);
  };

  return (
    <Shell title="Check out machine" onBack={onBack}>
      <MachinePicker machines={machines} value={code} onChange={setCode} />
      {blocked && <ErrorBox message={blocked} />}
      {machine && !blocked && (
        <>
          <OperatorPicker operators={operators} value={operator} onChange={setOperator} label="Responsible operator" />
          <div className="space-y-3">
            <Label>Task / location</Label>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What and where"
              className="field w-full rounded-2xl border-4 border-field-line bg-field px-4 text-2xl font-bold text-field-ink"
            />
          </div>
          {needFuel && <FuelPicker value={fuel} onChange={setFuel} />}
          <Check checked={safe} onChange={setSafe} label="This is clearly the right and safe option for the task" />
          <ErrorBox message={error} />
          <Submit disabled={!ready} busy={busy} label="Check out" onClick={submit} />
        </>
      )}
    </Shell>
  );
}

/* ---------------- Transfer ---------------- */

function Transfer({
  machines,
  operators,
  onDone,
  onBack,
}: {
  machines: Machine[];
  operators: string[];
  onDone: () => void;
  onBack: () => void;
}) {
  const held = machines.filter((m) => !!m.responsible_operator);
  const [code, setCode] = useState("");
  const [newOperator, setNewOperator] = useState("");
  const [task, setTask] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[] | null>(null);

  const machine = held.find((m) => m.code === code) ?? null;
  const ready = !!machine && !!newOperator && task.trim().length > 0 && authorized;

  if (saved) return <Confirmation lines={saved} onDone={onDone} />;

  const submit = async () => {
    setBusy(true);
    setError("");
    const { error: e } = await supabase.rpc("transfer_machine", {
      p_machine_code: code,
      p_current_operator_name: machine?.responsible_operator ?? "",
      p_new_operator_name: newOperator,
      p_task_location: task.trim(),
      p_authorization_confirmed: authorized,
    });
    setBusy(false);
    if (e) setError(rpcError(e));
    else setSaved([`${code} transferred`, `Now with: ${newOperator}`, `Task: ${task.trim()}`]);
  };

  return (
    <Shell title="Transfer machine" onBack={onBack}>
      <MachinePicker machines={held} value={code} onChange={setCode} />
      {machine && (
        <>
          <div className="rounded-2xl border-4 border-field-line p-4">
            <p className="text-lg font-bold opacity-70">Currently responsible</p>
            <p className="text-3xl font-black">{machine.responsible_operator}</p>
          </div>
          <OperatorPicker
            operators={operators.filter((o) => o !== machine.responsible_operator)}
            value={newOperator}
            onChange={setNewOperator}
            label="New operator"
          />
          <div className="space-y-3">
            <Label>Task / location</Label>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What and where"
              className="field w-full rounded-2xl border-4 border-field-line bg-field px-4 text-2xl font-bold text-field-ink"
            />
          </div>
          <Check checked={authorized} onChange={setAuthorized} label="Transfer is authorized" />
          <ErrorBox message={error} />
          <Submit disabled={!ready} busy={busy} label="Transfer" onClick={submit} />
        </>
      )}
    </Shell>
  );
}

/* ---------------- Return / EOD ---------------- */

function ReturnEod({
  machines,
  operators,
  onDone,
  onBack,
}: {
  machines: Machine[];
  operators: string[];
  onDone: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [operator, setOperator] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fuel, setFuel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[] | null>(null);

  const machine = machines.find((m) => m.code === code) ?? null;
  const locked = machine?.responsible_operator ?? "";
  const chosenOperator = locked || operator;
  const needFuel = machine ? fuelNeeded(machine) : false;
  const ready = !!machine && !!chosenOperator && !!file && (!needFuel || !!fuel);

  if (saved) return <Confirmation lines={saved} onDone={onDone} />;

  const submit = async () => {
    if (!machine || !file) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadPhoto(machine.code, file);
      const { error: e } = await supabase.rpc("return_machine", {
        p_machine_code: machine.code,
        p_operator_name: chosenOperator,
        p_photo_url: url,
        p_fuel_level: needFuel ? fuel : undefined,
        p_note: note.trim() || undefined,
      });
      if (e) setError(rpcError(e));
      else
        setSaved([
          `${machine.code} returned`,
          `Operator: ${chosenOperator}`,
          `Left at: ${machine.return_location ?? "return location"}`,
        ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    }
    setBusy(false);
  };

  return (
    <Shell title="Return machine / end-of-day" onBack={onBack}>
      <MachinePicker machines={machines} value={code} onChange={setCode} />
      {machine && (
        <>
          <div className="rounded-2xl border-4 border-field-accent p-4">
            <p className="text-lg font-bold opacity-70">Return location</p>
            <p className="text-3xl font-black">{machine.return_location ?? "—"}</p>
            <p className="mt-1 text-xl font-bold">The machine must be parked here before you submit.</p>
          </div>
          {locked ? (
            <div className="rounded-2xl border-4 border-field-line p-4">
              <p className="text-lg font-bold opacity-70">Responsible operator</p>
              <p className="text-3xl font-black">{locked}</p>
            </div>
          ) : (
            <OperatorPicker operators={operators} value={operator} onChange={setOperator} label="Who is returning it" />
          )}
          <PhotoInput file={file} onPick={setFile} />
          {needFuel && <FuelPicker value={fuel} onChange={setFuel} />}
          <div className="space-y-3">
            <Label>Note (optional)</Label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything to flag"
              className="field w-full rounded-2xl border-4 border-field-line bg-field px-4 text-2xl font-bold text-field-ink"
            />
          </div>
          <ErrorBox message={error} />
          <Submit disabled={!ready} busy={busy} label="Return machine" onClick={submit} />
        </>
      )}
    </Shell>
  );
}

/* ---------------- Report issue ---------------- */

function ReportIssue({
  machines,
  operators,
  onDone,
  onBack,
}: {
  machines: Machine[];
  operators: string[];
  onDone: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [reporter, setReporter] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dno, setDno] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[] | null>(null);

  const machine = machines.find((m) => m.code === code) ?? null;
  const ready = !!machine && !!reporter && description.trim().length > 0 && !!file && dno;

  if (saved) return <Confirmation lines={saved} onDone={onDone} />;

  const submit = async () => {
    if (!machine || !file) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadPhoto(machine.code, file);
      const { error: e } = await supabase.rpc("report_machine_issue", {
        p_machine_code: machine.code,
        p_reporter_name: reporter,
        p_description: description.trim(),
        p_photo_url: url,
        p_do_not_operate_confirmed: dno,
      });
      if (e) setError(rpcError(e));
      else setSaved([`${machine.code} reported`, "Marked Do Not Operate", `Reported by: ${reporter}`]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    }
    setBusy(false);
  };

  return (
    <Shell title="Report issue" onBack={onBack}>
      <MachinePicker machines={machines} value={code} onChange={setCode} />
      {machine && (
        <>
          <OperatorPicker operators={operators} value={reporter} onChange={setReporter} label="Who is reporting" />
          <div className="space-y-3">
            <Label>What is wrong</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short description"
              className="w-full rounded-2xl border-4 border-field-line bg-field p-4 text-2xl font-bold text-field-ink"
            />
          </div>
          <PhotoInput file={file} onPick={setFile} />
          <Check checked={dno} onChange={setDno} label="Do Not Operate" />
          <ErrorBox message={error} />
          <Submit disabled={!ready} busy={busy} label="Report issue" onClick={submit} />
        </>
      )}
    </Shell>
  );
}
