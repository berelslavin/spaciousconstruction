// Open fuel requests list, shown to admin (PIN) and to operators marked as fuel runners.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FUEL, fmtTime, rpcError } from "@/lib/equipment";

type Req = {
  id: string;
  machine_code: string;
  machine_name: string;
  requested_by: string | null;
  task_location: string | null;
  note: string | null;
  created_at: string;
};

const LEVELS = FUEL.filter((f) => f !== "Needs Fuel");

export function FuelRequests({
  by,
  pin,
  onChange,
}: {
  by: string;
  pin?: string;
  onChange?: () => void;
}) {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("open_fuel_requests");
    setReqs((data ?? []) as Req[]);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const fueled = async (id: string, level: string) => {
    if (!by.trim()) {
      setErr("Enter your name first.");
      return;
    }
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc("complete_fuel_request", {
      p_id: id,
      p_by: by,
      p_fuel_level: level,
      ...(pin ? { p_pin: pin } : {}),
    });
    setBusy(false);
    if (error) setErr(rpcError(error));
    else {
      setOpenId(null);
      void load();
      onChange?.();
    }
  };

  if (reqs.length === 0) return null;
  return (
    <div className="mt-4 rounded-2xl border-4 border-field-accent p-3">
      <p className="text-xl font-black">
        ⛽ Fuel requested ({reqs.length})
      </p>
      {err && <p className="mt-1 font-bold text-field-stop">{err}</p>}
      <div className="mt-1 divide-y divide-field-line">
        {reqs.map((r) => (
          <div key={r.id} className="py-2">
            <div className="flex min-h-[56px] items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black leading-tight">
                  {r.machine_code} <span className="font-bold text-field-dim">{r.machine_name}</span>
                </p>
                <p className="truncate text-sm text-field-dim">
                  {r.requested_by ?? "—"} · {fmtTime(r.created_at)}
                  {r.task_location ? ` · ${r.task_location}` : ""}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className="min-h-[56px] rounded-2xl bg-field-accent px-4 text-lg font-black text-field-accent-ink"
              >
                {openId === r.id ? "Cancel" : "Fueled"}
              </button>
            </div>
            {openId === r.id && (
              <div className="mt-2">
                <p className="text-base font-bold">How full is it now?</p>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      disabled={busy}
                      onClick={() => fueled(r.id, l)}
                      className="min-h-[56px] rounded-2xl border-4 border-field-line text-xl font-black active:bg-field-panel"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
