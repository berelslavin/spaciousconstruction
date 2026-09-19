import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { STATUS_LABEL, STATUS_ORDER, type ConfirmStatus } from "@/lib/data";

export function Header({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 pb-3 pt-4 backdrop-blur">
      {back ? (
        <Link to={back} className="mb-1 block text-sm font-semibold text-primary">
          ‹ Back
        </Link>
      ) : null}
      <h1 className="text-2xl font-bold uppercase leading-none">{title}</h1>
      {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
    </header>
  );
}

const statusClass: Record<ConfirmStatus, string> = {
  confirmed: "bg-ok text-ok-foreground",
  not_confirmed: "bg-warn text-warn-foreground",
  coming: "bg-primary text-primary-foreground",
  not_coming: "bg-bad text-bad-foreground",
  completed: "bg-done text-done-foreground",
};

export function StatusTag({ status }: { status: ConfirmStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusClass[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StatusPicker({
  value,
  onChange,
}: {
  value: ConfirmStatus;
  onChange: (s: ConfirmStatus) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`tap w-full rounded-lg px-1 text-xs font-bold uppercase ${
            value === s ? statusClass[s] : "bg-muted text-muted-foreground"
          }`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase text-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="card-pad text-sm text-muted-foreground">{children}</p>;
}
