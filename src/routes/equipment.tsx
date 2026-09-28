import { createFileRoute, Link } from "@tanstack/react-router";
// me/saveMe: this phone remembers the last operator (localStorage sb_operator) to pre-fill pickers.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FUEL,
  S_DNO,
  S_EOD,
  S_OUT,
  fmtDate,
  loadMachines,
  rpcError,
  shortStatus,
  statusTone,
  todayChicago,
  uploadPhoto,
  useOnline,
  type Machine,
} from "@/lib/equipment";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Spacious Bay Field — Machines" },
      {
        name: "description",
        content: "Check out, transfer, return or report a machine in a few taps.",
      },
      { property: "og:title", content: "Spacious Bay Field — Machines" },
      {
        property: "og:description",
        content: "Check out, transfer, return or report a machine in a few taps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#15181c" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SB Machines" },
    ],
    links: [{ rel: "manifest", href: "/equipment.webmanifest" }],
  }),
  component: FieldPage,
});

type Flow = "checkout" | "transfer" | "return" | "issue";

const SAFETY_TEXT =
  "This machine is clearly the right and safe option for this task. If the risk is too high for the benefit, we use human labor instead.";

function FieldPage() {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [returnMachineCode, setReturnMachineCode] = useState("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [access, setAccess] = useState<Set<string>>(new Set());
  const [runners, setRunners] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [me, setMe] = useState(() =>
    typeof window === "undefined" ? "" : (localStorage.getItem("sb_operator") ?? ""),
  );
  const online = useOnline();

  const saveMe = useCallback((name: string) => {
    setMe(name);
    try {
      if (name) localStorage.setItem("sb_operator", name);
      else localStorage.removeItem("sb_operator");
    } catch {
      /* private mode — remembering just won't persist */
    }
  }, []);

  const load = useCallback(async () => {
    const [mRes, oRes, aRes, rRes] = await Promise.all([
      loadMachines(),
      supabase.from("operators").select("name").eq("active", true).order("name"),
      supabase.rpc("operator_machine_access"),
      supabase.rpc("fuel_runners"),
    ]);
    if (mRes.error || oRes.error || aRes.error) {
      setLoadError("Could not load machines. Check connection and try again.");
    } else {
      setLoadError("");
      setMachines((mRes.data ?? []) as Machine[]);
      setOperators((oRes.data ?? []).map((o: { name: string }) => o.name));
      setAccess(new Set((aRes.data ?? []).map((a) => `${a.operator}|${a.machine_code}`)));
      setRunners((rRes.data ?? []).map((r: { name: string }) => r.name));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  useEffect(() => {
    if (online) void load();
  }, [online, load]);

  const done = () => {
    setFlow(null);
    setReturnMachineCode("");
    window.scrollTo(0, 0);
    void load();
  };
  const open = (f: Flow) => {
    setReturnMachineCode("");
    setFlow(f);
    window.scrollTo(0, 0);
    void load();
  };
  const openReturn = (code = "") => {
    setReturnMachineCode(code);
    setFlow("return");
    window.scrollTo(0, 0);
    void load();
  };

  return (
    <div
      className="min-h-screen bg-field px-4 text-field-ink"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
      }}
    >
      <div className="flex items-center justify-between gap-2 text-sm font-bold">
        <span className="uppercase tracking-widest text-field-dim">Spacious Bay Field</span>
        <span className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${online ? "bg-field-go" : "bg-field-stop"}`}
            aria-hidden
          />
          <span>{online ? "Online" : "Offline"}</span>
          <span className="text-field-dim">· {loaded ? `${machines.length} machines` : "…"}</span>
        </span>
      </div>

      {!online && (
        <p className="mt-3 rounded-xl bg-field-stop p-3 text-lg font-bold">
          No connection. Nothing can be saved until you are back online.
        </p>
      )}
      {loadError && online && (
        <p className="mt-3 rounded-xl bg-field-stop p-3 text-lg font-bold">{loadError}</p>
      )}

      {flow === null && (
        <>
          {loaded && me && (
            <MyMachines machines={machines} me={me} goReturn={openReturn} />
          )}
          {me && runners.includes(me) && <FuelRequests by={me} onChange={load} />}
          <h1 className="mt-5 text-4xl font-black leading-tight">What are you doing?</h1>
          <div className="mt-5 space-y-3">
            <HomeButton label="Check out machine" hint="Start using a machine" onClick={() => open("checkout")} />
            <HomeButton label="Transfer machine" hint="Hand over with admin approval" onClick={() => open("transfer")} />
            <HomeButton label="Return machine / end-of-day" hint="Park it, take a photo" onClick={() => open("return")} />
            <HomeButton label="Report issue" hint="Damage or defect — stops the machine" onClick={() => open("issue")} danger />
          </div>
          {me && (
            <p className="mt-5 text-center text-base font-bold text-field-dim">
              This phone is {me}.{" "}
              <button
                type="button"
                onClick={() => saveMe("")}
                className="inline-flex min-h-11 items-center px-2 underline underline-offset-4"
              >
                Not you?
              </button>
            </p>
          )}
          <div className="mt-4 text-center">
            <Link
              to="/equipment-admin"
              className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-field-dim underline underline-offset-4"
            >
              Admin
            </Link>
          </div>
        </>

      )}

      {flow === "checkout" && (
        <Checkout
          machines={machines}
          operators={operators}
          online={online}
          onDone={done}
          onBack={done}
          goReturn={openReturn}
          access={access}
          me={me}
          saveMe={saveMe}
        />
      )}
      {flow === "transfer" && (
        <Transfer
          machines={machines}
          online={online}
          onDone={done}
          onBack={done}
          goReturn={openReturn}
        />
      )}
      {flow === "return" && (
        <ReturnEod
          machines={machines}
          operators={operators}
          online={online}
          onDone={done}
          onBack={done}
          initialCode={returnMachineCode}
          me={me}
          saveMe={saveMe}
        />
      )}
      {flow === "issue" && (
        <ReportIssue
          machines={machines}
          operators={operators}
          online={online}
          onDone={done}
          onBack={done}
          me={me}
          saveMe={saveMe}
        />
      )}
    </div>
  );
}

function HomeButton({
  label,
  hint,
  onClick,
  danger,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[92px] w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left active:scale-[0.99] active:opacity-80 ${
        danger
          ? "border-4 border-field-stop bg-field-panel text-field-ink"
          : "bg-field-accent text-field-accent-ink"
      }`}
    >
      <span>
        <span className="block text-[26px] font-black leading-tight">{label}</span>
        <span className="mt-0.5 block text-base font-semibold opacity-75">{hint}</span>
      </span>
      <span aria-hidden className="text-3xl font-black opacity-60">›</span>
    </button>
  );
}

function MyMachines({
  machines,
  me,
  goReturn,
}: {
  machines: Machine[];
  me: string;
  goReturn: (code: string) => void;
}) {
  const mine = machines.filter((m) => m.responsible_operator === me);
  if (mine.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {mine.map((m) => {
        const dno = m.status === S_DNO;
        const needsReturn = !!m.eod_missing;
        return (
          <div
            key={m.code}
            className={`rounded-2xl border-4 p-4 ${
              dno ? "border-field-stop" : needsReturn ? "border-field-eod" : "border-field-line"
            }`}
          >
            <p className="text-xl font-black leading-tight">
              You hold: {m.code} <span className="font-bold text-field-dim">{m.name}</span>
            </p>
            <p className="mt-0.5 text-base font-bold text-field-dim">
              {dno
                ? "Do Not Operate — park it at its return location."
                : needsReturn
                  ? "End-of-day is missing — do the return today."
                  : (m.current_task_location ?? "Checked out")}
            </p>
            {(dno || needsReturn) && (
              <button
                type="button"
                onClick={() => goReturn(m.code)}
                className={`mt-3 min-h-[64px] w-full rounded-2xl text-2xl font-black ${
                  dno ? "bg-field-stop text-field-ink" : "bg-field-eod text-field-accent-ink"
                }`}
              >
                Return / end-of-day now
              </button>
            )}
            <RequestFuel code={m.code} me={me} />
          </div>
        );
      })}
    </div>
  );
}

function RequestFuel({ code, me }: { code: string; me: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | string>("idle");
  const send = async () => {
    setState("busy");
    const { data, error } = await supabase.rpc("request_fuel", {
      p_machine_code: code,
      p_operator_name: me,
    });
    if (error) setState(rpcError(error));
    else setState((data as { already?: boolean })?.already ? "already" : "sent");
  };
  if (state === "sent" || state === "already")
    return (
      <p className="mt-3 text-lg font-black text-field-go">
        ⛽ Fuel {state === "already" ? "already requested" : "requested"} — help is on the way.
      </p>
    );
  return (
    <>
      <button
        type="button"
        disabled={state === "busy"}
        onClick={send}
        className="mt-3 min-h-[56px] w-full rounded-2xl border-4 border-field-accent text-xl font-black"
      >
        ⛽ Request fuel
      </button>
      {state !== "idle" && state !== "busy" && (
        <p className="mt-1 font-bold text-field-stop">{state}</p>
      )}
    </>
  );
}

function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pb-6">
      <button
        type="button"
        onClick={onBack}
        className="mt-2 min-h-[56px] pr-6 text-xl font-bold underline"
      >
        ← Back
      </button>
      <h1 className="text-3xl font-black leading-tight">{title}</h1>
      <div className="mt-5 space-y-6">{children}</div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-xl font-bold">{children}</p>;
}

function MachinePicker({
  machines,
  value,
  onChange,
  empty,
}: {
  machines: Machine[];
  value: string;
  onChange: (code: string) => void;
  empty: string;
}) {
  const chosen = machines.find((m) => m.code === value);
  const list = chosen ? [chosen] : machines;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Machine</Label>
        {chosen && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="min-h-[56px] pl-4 text-lg font-bold underline"
          >
            Change
          </button>
        )}
      </div>
      {machines.length === 0 && <p className="rounded-2xl bg-field-panel p-4 text-lg">{empty}</p>}
      {list.length > 0 && (
        <div
          className={`divide-y divide-field-line overflow-hidden rounded-2xl ${
            chosen ? "border-4 border-field-accent bg-field-panel" : "border-2 border-field-line"
          }`}
        >
          {list.map((m) => {
            const sel = value === m.code;
            return (
              <button
                key={m.code}
                type="button"
                onClick={() => onChange(sel ? "" : m.code)}
                aria-pressed={sel}
                className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2 text-left active:bg-field-panel"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xl font-black leading-tight">
                    {m.code} <span className="font-bold text-field-dim">{m.name}</span>
                  </span>
                  <span className="block truncate text-sm text-field-dim">
                    {m.responsible_operator ? `With ${m.responsible_operator}` : "No one has it"}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-black ${statusTone(m.status)}`}
                >
                  {shortStatus(m.status)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OperatorPicker({
  operators,
  value,
  onChange,
  label,
  isAllowed,
}: {
  operators: string[];
  value: string;
  onChange: (name: string) => void;
  label: string;
  isAllowed?: (name: string) => boolean;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[60px] w-full rounded-2xl border-4 border-field-line bg-field-panel px-4 text-2xl font-bold text-field-ink"
      >
        <option value="">Choose a person…</option>
        {operators.map((o) => {
          const ok = !isAllowed || isAllowed(o);
          return (
            <option key={o} value={o} disabled={!ok}>
              {ok ? o : `🔒 ${o} — not authorized for this machine`}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block space-y-3">
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="done"
        className="min-h-[60px] w-full rounded-2xl border-4 border-field-line bg-field-panel px-4 text-2xl font-bold text-field-ink placeholder:text-field-dim"
      />
    </label>
  );
}

function FuelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <Label>Today's fuel reading</Label>
      <div className="grid grid-cols-2 gap-3">
        {FUEL.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            aria-pressed={value === f}
            className={`min-h-[60px] rounded-2xl border-4 text-2xl font-black ${
              f === "Needs Fuel" ? "col-span-2" : ""
            } ${value === f ? "border-field-accent bg-field-accent text-field-accent-ink" : "border-field-line"}`}
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
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-[64px] w-full items-start gap-3 rounded-2xl border-4 px-4 py-3 text-left text-xl font-bold ${
        checked ? "border-field-go bg-field-panel" : "border-field-line"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-4 text-xl font-black ${
          checked ? "border-field-go bg-field-go text-field-accent-ink" : "border-field-dim"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span>{label}</span>
    </button>
  );
}

function Info({ label, value, big }: { label: string; value: ReactNode; big?: boolean }) {
  return (
    <div className="rounded-2xl bg-field-panel p-4">
      <p className="text-base font-bold text-field-dim">{label}</p>
      <p className={`${big ? "text-3xl" : "text-2xl"} font-black leading-tight`}>{value}</p>
    </div>
  );
}

function Submit({
  disabled,
  busy,
  label,
  onClick,
  online,
}: {
  disabled: boolean;
  busy: boolean;
  label: string;
  onClick: () => void;
  online: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy || !online}
      onClick={onClick}
      className="min-h-[80px] w-full rounded-2xl bg-field-accent text-3xl font-black text-field-accent-ink disabled:opacity-35"
    >
      {!online ? "Offline — can't save" : busy ? "Saving…" : label}
    </button>
  );
}

function Alert({ message, tone = "stop" }: { message: string; tone?: "stop" | "eod" }) {
  if (!message) return null;
  return (
    <p
      className={`rounded-2xl p-4 text-xl font-bold ${tone === "stop" ? "bg-field-stop text-field-ink" : "bg-field-eod text-field-accent-ink"}`}
    >
      {message}
    </p>
  );
}

function Missing({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return <p className="text-lg font-bold text-field-dim">Still needed: {items.join(", ")}</p>;
}

function Confirmation({
  title,
  lines,
  onDone,
}: {
  title: string;
  lines: string[];
  onDone: () => void;
}) {
  return (
    <div className="pb-6">
      <p className="mt-8 text-6xl" aria-hidden>
        ✓
      </p>
      <h1 className="mt-2 text-4xl font-black leading-tight text-field-go">{title}</h1>
      <div className="mt-4 space-y-2 text-2xl font-bold">
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="mt-8 min-h-[88px] w-full rounded-2xl bg-field-accent text-3xl font-black text-field-accent-ink"
      >
        Done
      </button>
    </div>
  );
}

function PhotoInput({
  file,
  onPick,
  label,
}: {
  file: File | null;
  onPick: (f: File | null) => void;
  label: string;
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
      <Label>{label}</Label>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label={label}
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {preview && (
        <img
          src={preview}
          alt="Photo preview"
          className="max-h-80 w-full rounded-2xl border-4 border-field-line object-cover"
        />
      )}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="min-h-[64px] w-full rounded-2xl border-4 border-field-line text-2xl font-black"
      >
        📷 {file ? "Retake photo" : "Take photo"}
      </button>
    </div>
  );
}

/* ---------------- Checkout ---------------- */

function Checkout({
  machines,
  operators,
  online,
  onDone,
  onBack,
  goReturn,
  access,
  me,
  saveMe,
}: {
  machines: Machine[];
  operators: string[];
  online: boolean;
  onDone: () => void;
  onBack: () => void;
  goReturn: (code: string) => void;
  access: Set<string>;
  me: string;
  saveMe: (name: string) => void;
}) {
  const [code, setCode] = useState("");
  const [operator, setOperator] = useState(() => (operators.includes(me) ? me : ""));
  const [task, setTask] = useState("");
  const [safe, setSafe] = useState(false);
  const [fuel, setFuel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[] | null>(null);

  const machine = useMemo(() => machines.find((m) => m.code === code) ?? null, [machines, code]);
  useEffect(() => {
    if (operator && !access.has(`${operator}|${code}`)) setOperator("");
  }, [code, operator, access]);
  const dno = machine?.status === S_DNO;
  const eodMissing = !!machine?.eod_missing;
  const held = !!machine?.responsible_operator;
  const blocked = dno
    ? "DO NOT OPERATE — this machine has an open issue. It cannot be checked out until an admin clears it."
    : eodMissing
      ? ""
      : held
        ? `Already checked out to ${machine.responsible_operator}. A handoff needs an admin-approved transfer.`
        : "";
  const needFuel = machine ? !machine.fuel_logged_today : false;
  const missing = [
    !operator && "operator",
    !task.trim() && "task/location",
    needFuel && !fuel && "fuel reading",
    !safe && "safety confirmation",
  ].filter(Boolean) as string[];

  if (saved) return <Confirmation title="Checked out" lines={saved} onDone={onDone} />;

  const submit = async () => {
    setBusy(true);
    setError("");
    const { error: e } = await supabase.rpc("checkout_machine", {
      p_machine_code: code,
      p_operator_name: operator,
      p_task_location: task.trim(),
      p_safe_confirmed: safe,
      ...(needFuel ? { p_fuel_level: fuel } : {}),
    });
    setBusy(false);
    if (e) setError(rpcError(e));
    else {
      saveMe(operator);
      setSaved([
        `${code} ${machine?.name ?? ""}`,
        `Responsible: ${operator}`,
        `Task: ${task.trim()}`,
        "You own it until return or approved transfer.",
      ]);
    }
  };

  return (
    <Shell title="Check out machine" onBack={onBack}>
      <MachinePicker
        machines={machines}
        value={code}
        onChange={setCode}
        empty="No active machines."
      />
      {machine && blocked && <Alert message={blocked} />}
      {machine && !dno && eodMissing && (
        <>
          <Alert
            tone="eod"
            message={`End-of-day for ${machine.code} is missing (last: ${fmtDate(machine.last_eod_date)}). Complete Return / end-of-day first.${held ? ` ${machine.responsible_operator} must return it.` : ""}`}
          />
          <button
            type="button"
            onClick={() => goReturn(machine.code)}
            className="min-h-[72px] w-full rounded-2xl bg-field-eod text-2xl font-black text-field-accent-ink"
          >
            Go to Return / end-of-day
          </button>
        </>
      )}
      {machine && !blocked && !eodMissing && (
        <>
          <OperatorPicker
            operators={operators}
            value={operator}
            onChange={setOperator}
            label="Responsible operator"
            isAllowed={(n) => access.has(`${n}|${code}`)}
          />
          {operators.length > 0 && !operators.some((n) => access.has(`${n}|${code}`)) && (
            <Alert message="No one is authorized for this machine yet. Ask an admin to add operators for it." />
          )}
          <TextInput
            label="Task / location"
            value={task}
            onChange={setTask}
            placeholder="e.g. Trenching, House 9"
          />
          {needFuel && <FuelPicker value={fuel} onChange={setFuel} />}
          <Check checked={safe} onChange={setSafe} label={SAFETY_TEXT} />
          <Alert message={error} />
          <Missing items={missing} />
          <Submit
            disabled={missing.length > 0}
            busy={busy}
            online={online}
            label="Check out"
            onClick={submit}
          />
        </>
      )}
    </Shell>
  );
}

/* ---------------- Transfer ---------------- */

function Transfer({
  machines,
  online,
  onDone,
  onBack,
  goReturn,
}: {
  machines: Machine[];
  online: boolean;
  onDone: () => void;
  onBack: () => void;
  goReturn: (code: string) => void;
}) {
  const held = machines.filter((m) => !!m.responsible_operator);
  const [code, setCode] = useState("");
  const [dests, setDests] = useState<string[] | null>(null);
  const [newOperator, setNewOperator] = useState("");
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[] | null>(null);

  const machine = held.find((m) => m.code === code) ?? null;
  const dno = machine?.status === S_DNO;
  const eodMissing = machine?.status === S_EOD;
  const statusBlocked = dno || eodMissing;

  useEffect(() => {
    setDests(null);
    setNewOperator("");
    setError("");
    if (!code || statusBlocked) return;
    let live = true;
    void supabase
      .rpc("get_transfer_destinations", { p_machine_code: code })
      .then(({ data, error: e }) => {
        if (!live) return;
        if (e) {
          setError(rpcError(e));
          setDests([]);
        } else {
          const list = (data ?? []).map((d: { to_operator: string }) => d.to_operator);
          setDests(list);
          if (list.length === 1) setNewOperator(list[0] ?? "");
        }
      });
    return () => {
      live = false;
    };
  }, [code, statusBlocked]);

  if (saved) return <Confirmation title="Transferred" lines={saved} onDone={onDone} />;

  const submit = async () => {
    setBusy(true);
    setError("");
    const { error: e } = await supabase.rpc("transfer_machine", {
      p_machine_code: code,
      p_current_operator_name: machine?.responsible_operator ?? "",
      p_new_operator_name: newOperator,
      p_task_location: task.trim(),
    });
    setBusy(false);
    if (e) setError(rpcError(e));
    else
      setSaved([
        `${code} ${machine?.name ?? ""}`,
        `Now responsible: ${newOperator}`,
        `Task: ${task.trim()}`,
      ]);
  };

  const missing = [!newOperator && "new operator", !task.trim() && "task/location"].filter(
    Boolean,
  ) as string[];

  return (
    <Shell title="Transfer machine" onBack={onBack}>
      <MachinePicker
        machines={held}
        value={code}
        onChange={setCode}
        empty="No machines are checked out right now."
      />
      {machine && (
        <>
          <Info label="Currently responsible" value={machine.responsible_operator} big />
          {dno && (
            <Alert message="Do Not Operate — this machine cannot be transferred until the issue is cleared by admin." />
          )}
          {eodMissing && (
            <>
              <Alert
                tone="eod"
                message="End-of-day is missing for this machine. Complete Return / End-of-Day before transferring it."
              />
              <button
                type="button"
                onClick={() => goReturn(machine.code)}
                className="min-h-[80px] w-full rounded-2xl bg-field-eod px-4 text-2xl font-black text-field-accent-ink"
              >
                Go to Return / End-of-Day
              </button>
            </>
          )}
          {!statusBlocked && dests === null && (
            <p className="text-lg text-field-dim">Checking approvals…</p>
          )}
          {!statusBlocked && dests && dests.length === 0 && (
            <Alert message="No valid transfer authorization for this machine today. Admin approval is required before handing it over." />
          )}
          {!statusBlocked && dests && dests.length > 0 && (
            <>
              <div className="space-y-3">
                <Label>Approved new operator</Label>
                {dests.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={newOperator === d}
                    onClick={() => setNewOperator(d)}
                    className={`min-h-[64px] w-full rounded-2xl border-4 px-4 text-left text-2xl font-black ${
                      newOperator === d
                        ? "border-field-accent bg-field-accent text-field-accent-ink"
                        : "border-field-line"
                    }`}
                  >
                    {d}
                  </button>
                ))}
                <p className="text-base text-field-dim">
                  Approved by admin · valid today only · one use
                </p>
              </div>
              <TextInput
                label="Task / location"
                value={task}
                onChange={setTask}
                placeholder="e.g. Grading, House 12"
              />
              <Alert message={error} />
              <Missing items={missing} />
              <Submit
                disabled={missing.length > 0}
                busy={busy}
                online={online}
                label="Transfer"
                onClick={submit}
              />
            </>
          )}
          {!statusBlocked && dests && dests.length === 0 && <Alert message={error} />}
        </>
      )}
    </Shell>
  );
}

/* ---------------- Return / EOD ---------------- */

function ReturnEod({
  machines,
  operators,
  online,
  onDone,
  onBack,
  initialCode,
  me,
  saveMe,
}: {
  machines: Machine[];
  operators: string[];
  online: boolean;
  onDone: () => void;
  onBack: () => void;
  initialCode: string;
  me: string;
  saveMe: (name: string) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [operator, setOperator] = useState(() => (operators.includes(me) ? me : ""));
  const [photo, setPhoto] = useState<File | null>(null);
  const [fuel, setFuel] = useState("");
  const [note, setNote] = useState("");
  const [parked, setParked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[] | null>(null);

  const machine = machines.find((m) => m.code === code) ?? null;
  const locked = machine?.responsible_operator ?? null;
  const redundant = !!machine && !locked && !machine.eod_missing;
  const who = locked ?? operator;
  const needFuel = machine ? !machine.fuel_logged_today : false;
  const missing = [
    !who && "operator",
    !photo && "photo",
    needFuel && !fuel && "fuel reading",
    !parked && "parking confirmation",
  ].filter(Boolean) as string[];

  useEffect(() => {
    setOperator(operators.includes(me) ? me : "");
    setParked(false);
    setFuel("");
  }, [code, operators, me]);

  if (saved) return <Confirmation title="EOD complete" lines={saved} onDone={onDone} />;

  const submit = async () => {
    if (!machine || !photo) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadPhoto(machine.code, photo);
      const { data, error: e } = await supabase.rpc("return_machine", {
        p_machine_code: machine.code,
        p_operator_name: who,
        p_photo_url: url,
        p_parked_confirmed: parked,
        ...(needFuel ? { p_fuel_level: fuel } : {}),
        ...(note.trim() ? { p_note: note.trim() } : {}),
      });
      if (e) throw new Error(rpcError(e));
      saveMe(who);
      const eod = (data as { eod_date?: string } | null)?.eod_date ?? todayChicago();
      setSaved([
        `${machine.code} ${machine.name ?? ""}`,
        `EOD complete for ${fmtDate(eod)}`,
        `At: ${machine.return_location ?? "—"}`,
        `By: ${who}`,
      ]);
    } catch (err) {
      setError(err instanceof Error ? rpcError({ message: err.message }) : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Return / end-of-day" onBack={onBack}>
      <MachinePicker
        machines={machines}
        value={code}
        onChange={setCode}
        empty="No active machines."
      />
      {machine && (
        <>
          <div className="rounded-2xl border-4 border-field-accent p-4">
            <p className="text-base font-bold text-field-dim">Park it here — required</p>
            <p className="text-3xl font-black leading-tight">{machine.return_location ?? "—"}</p>
          </div>
          {locked ? (
            <Info label="Responsible operator (must return it)" value={locked} />
          ) : (
            !redundant && (
              <OperatorPicker
                operators={operators}
                value={operator}
                onChange={setOperator}
                label="Who is confirming EOD"
              />
            )
          )}
          {machine.status === S_DNO && locked && (
            <Alert message="Do Not Operate — return this machine to its designated location. Admin clearance is still required before use." />
          )}
          {redundant ? (
            <Alert
              tone="eod"
              message={`End-of-day is already complete for ${fmtDate(machine.required_eod_date)}. No additional return is needed.`}
            />
          ) : (
            <>
              <PhotoInput
                file={photo}
                onPick={setPhoto}
                label="Clear photo of machine at return location"
              />
              {needFuel && <FuelPicker value={fuel} onChange={setFuel} />}
              <TextInput
                label="Note (optional)"
                value={note}
                onChange={setNote}
                placeholder="Anything to know"
              />
              <Check
                checked={parked}
                onChange={setParked}
                label={`The machine is physically parked at ${machine.return_location ?? "its designated return location"}.`}
              />
              <Alert message={error} />
              <Missing items={missing} />
              <Submit
                disabled={missing.length > 0}
                busy={busy}
                online={online}
                label={machine.status === S_DNO ? "Return to designated location" : "Confirm EOD"}
                onClick={submit}
              />
            </>
          )}
        </>
      )}
    </Shell>
  );
}

/* ---------------- Report issue ---------------- */

function ReportIssue({
  machines,
  operators,
  online,
  onDone,
  onBack,
  me,
  saveMe,
}: {
  machines: Machine[];
  operators: string[];
  online: boolean;
  onDone: () => void;
  onBack: () => void;
  me: string;
  saveMe: (name: string) => void;
}) {
  const [code, setCode] = useState("");
  const [reporter, setReporter] = useState(() => (operators.includes(me) ? me : ""));
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[] | null>(null);

  const machine = machines.find((m) => m.code === code) ?? null;
  const missing = [
    !reporter && "reporter",
    !desc.trim() && "description",
    !photo && "photo",
  ].filter(Boolean) as string[];

  if (saved) return <Confirmation title="Issue reported" lines={saved} onDone={onDone} />;

  const submit = async () => {
    if (!machine || !photo) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadPhoto(machine.code, photo);
      const { error: e } = await supabase.rpc("report_machine_issue", {
        p_machine_code: machine.code,
        p_reporter_name: reporter,
        p_description: desc.trim(),
        p_photo_url: url,
      });
      if (e) throw new Error(rpcError(e));
      saveMe(reporter);
      setSaved([
        `${machine.code} is DO NOT OPERATE`,
        `Issue: ${desc.trim()}`,
        "Admin clearance is required before anyone uses it.",
      ]);
    } catch (err) {
      setError(err instanceof Error ? rpcError({ message: err.message }) : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Report issue" onBack={onBack}>
      <MachinePicker
        machines={machines}
        value={code}
        onChange={setCode}
        empty="No active machines."
      />
      {machine && (
        <>
          {(machine.open_issue_count ?? 0) > 0 && (
            <Alert
              message={`${machine.code} is already Do Not Operate with ${machine.open_issue_count} open issue${machine.open_issue_count === 1 ? "" : "s"}${machine.open_issue ? `: ${machine.open_issue}` : ""}. You can report a separate issue below.`}
            />
          )}
          <OperatorPicker
            operators={operators}
            value={reporter}
            onChange={setReporter}
            label="Reported by"
          />
          <label className="block space-y-3">
            <Label>What is wrong?</Label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="e.g. Hydraulic leak at left arm"
              className="w-full rounded-2xl border-4 border-field-line bg-field-panel px-4 py-3 text-2xl font-bold text-field-ink placeholder:text-field-dim"
            />
          </label>
          <PhotoInput file={photo} onPick={setPhoto} label="Photo of the problem" />
          <div className="rounded-2xl border-4 border-field-stop p-4">
            <p className="text-2xl font-black text-field-stop">
              This will mark {machine.code} DO NOT OPERATE
            </p>
            <p className="mt-1 text-lg font-bold">
              No one can check it out or transfer it until an admin clears the issue.
            </p>
          </div>
          <Alert message={error} />
          <Missing items={missing} />
          <button
            type="button"
            disabled={missing.length > 0 || busy || !online}
            onClick={submit}
            className="min-h-[80px] w-full rounded-2xl bg-field-stop text-2xl font-black text-field-ink disabled:opacity-35"
          >
            {!online ? "Offline — can't save" : busy ? "Saving…" : "Report & mark Do Not Operate"}
          </button>
        </>
      )}
    </Shell>
  );
}
