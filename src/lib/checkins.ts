import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TZ = "America/Chicago";

export function chicagoDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function chicagoTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

/** contractor_id -> checked_in_at for today's Chicago date, live across phones. */
export function useTodayCheckins() {
  const [map, setMap] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("crew_checkins")
      .select("contractor_id, checked_in_at")
      .eq("local_date", chicagoDate());
    if (data) setMap(Object.fromEntries(data.map((r) => [r.contractor_id, r.checked_in_at])));
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("crew_checkins")
      .on("postgres_changes", { event: "*", schema: "public", table: "crew_checkins" }, () => load())
      .subscribe();
    const t = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const checkIn = useCallback(
    async (contractorId: string) => {
      if (pending[contractorId] || map[contractorId]) return;
      setPending((p) => ({ ...p, [contractorId]: true }));
      const { data } = await supabase.rpc("check_in_crew", { p_contractor_id: contractorId });
      const row = data as { contractor_id: string; checked_in_at: string } | null;
      if (row?.checked_in_at) setMap((m) => ({ ...m, [contractorId]: row.checked_in_at }));
      setPending((p) => ({ ...p, [contractorId]: false }));
    },
    [map, pending],
  );

  return { map, pending, checkIn };
}
