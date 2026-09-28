import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Machine = {
  id: string | null;
  code: string;
  name: string | null;
  return_location: string | null;
  status: string | null;
  responsible_operator: string | null;
  current_task_location: string | null;
  last_activity_at: string | null;
  last_activity_type: string | null;
  fuel_level: string | null;
  fuel_logged_date: string | null;
  fuel_logged_today: boolean | null;
  last_eod_date: string | null;
  eod_missing: boolean | null;
  required_eod_date: string | null;
  open_issue: string | null;
  open_issue_count: number | null;
  needs_fuel: boolean | null;
  do_not_operate: boolean | null;
  custody_since: string | null;
  rain_today: boolean | null;
};

export const FUEL = ["Full", "¾", "½", "¼", "Needs Fuel"] as const;
export const TZ = "America/Chicago";

export const S_DNO = "Do Not Operate";
export const S_OUT = "Checked Out";
export const S_OK = "Available";
export const S_EOD = "Missing End-of-Day Confirmation";

export function todayChicago() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y = 1970, m = 1, day = 1] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function shortStatus(s: string | null) {
  return s === S_EOD ? "Missing EOD" : (s ?? "—");
}

export function statusTone(status: string | null) {
  if (status === S_DNO) return "bg-field-stop text-field-ink";
  if (status === S_OUT) return "bg-field-caution text-field-accent-ink";
  if (status === S_OK) return "bg-field-go text-field-accent-ink";
  return "bg-field-eod text-field-accent-ink";
}

export function rpcError(error: { message: string } | null) {
  if (!error) return "";
  const msg = error.message ?? "";
  if (/fetch|network|Failed to/i.test(msg)) return "No connection. Nothing was saved — try again when online.";
  return msg;
}

export async function loadMachines() {
  return supabase.from("machine_dashboard").select("*").order("code");
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", up);
    };
  }, []);
  return online;
}

/** Downscale camera photos (iPhone 12MP → ~1600px JPEG) so uploads are fast but still clear. */
export async function compressPhoto(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadPhoto(code: string, file: File) {
  const blob = await compressPhoto(file);
  const path = `${code}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supabase.storage
    .from("equipment-photos")
    .upload(path, blob, { upsert: false, contentType: blob.type || "image/jpeg" });
  if (error) throw new Error(rpcError(error) || error.message);
  return supabase.storage.from("equipment-photos").getPublicUrl(path).data.publicUrl;
}
