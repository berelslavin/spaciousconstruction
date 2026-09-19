import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  deliveries as seedDeliveries,
  moneyRows as seedMoney,
  punchItems as seedPunch,
  tasks as seedTasks,
  type ConfirmStatus,
  type Delivery,
  type Money,
  type PunchItem,
  type Task,
} from "./data";

type Store = {
  tasks: Task[];
  deliveries: Delivery[];
  punch: PunchItem[];
  money: Money[];
  setTaskStatus: (id: string, status: ConfirmStatus) => void;
  setDeliveryStatus: (id: string, status: ConfirmStatus) => void;
  togglePunch: (id: string) => void;
  addPunch: (item: Omit<PunchItem, "id" | "done">) => void;
  applyMoney: (id: string, change: { additions: number; paid: number; method: string; date: string }) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [deliveries, setDeliveries] = useState<Delivery[]>(seedDeliveries);
  const [punch, setPunch] = useState<PunchItem[]>(seedPunch);
  const [money, setMoney] = useState<Money[]>(seedMoney);

  const value = useMemo<Store>(
    () => ({
      tasks,
      deliveries,
      punch,
      money,
      setTaskStatus: (id, status) =>
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t))),
      setDeliveryStatus: (id, status) =>
        setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d))),
      togglePunch: (id) =>
        setPunch((prev) => prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p))),
      addPunch: (item) =>
        setPunch((prev) => [{ ...item, id: `p${Date.now()}`, done: false }, ...prev]),
      applyMoney: (id, change) =>
        setMoney((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  additions: m.additions + change.additions,
                  paid: m.paid + change.paid,
                  method: change.method,
                  lastPayment: change.date,
                }
              : m,
          ),
        ),
    }),
    [tasks, deliveries, punch, money],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
