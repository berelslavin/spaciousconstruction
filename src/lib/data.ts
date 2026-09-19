export type ConfirmStatus =
  | "confirmed"
  | "not_confirmed"
  | "coming"
  | "not_coming"
  | "completed";

export const STATUS_LABEL: Record<ConfirmStatus, string> = {
  confirmed: "Confirmed",
  not_confirmed: "Not Confirmed",
  coming: "Coming",
  not_coming: "Not Coming",
  completed: "Completed",
};

export const STATUS_ORDER: ConfirmStatus[] = [
  "confirmed",
  "not_confirmed",
  "coming",
  "not_coming",
  "completed",
];

export type Contractor = {
  id: string;
  name: string;
  trade: string;
  contact: string;
  phone: string;
  regular: boolean;
  houses: string[];
  completed: string[];
};

export type House = {
  id: string; // "5"
  kind: "home" | "land";
  stage: string;
  completion: number;
  inspections: { name: string; date: string; result: "passed" | "failed" | "scheduled" }[];
  photos: { caption: string; date: string }[];
  notes: string;
};

export type Task = {
  id: string;
  day: "today" | "tomorrow";
  contractorId: string;
  house: string;
  task: string;
  status: ConfirmStatus;
  time: string;
};

export type Delivery = {
  id: string;
  day: "today" | "tomorrow";
  what: string;
  house: string;
  supplier: string;
  window: string;
  status: ConfirmStatus;
};

export type PunchItem = {
  id: string;
  what: string;
  house: string;
  contractorId: string;
  due: string;
  done: boolean;
};

export type Money = {
  id: string;
  contractorId: string;
  house: string;
  quoteNumber: string;
  quote: number;
  additions: number;
  paid: number;
  method: string;
  lastPayment: string;
};

export const TRADES = [
  "Concrete",
  "Framing",
  "Roofing",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Drywall",
  "Paint",
  "Tile",
  "Windows & Doors",
  "Landscaping",
  "Site Work",
];

export const contractors: Contractor[] = [
  { id: "c1", name: "Delgado Concrete", trade: "Concrete", contact: "Rafa Delgado", phone: "956-555-0141", regular: true, houses: ["9", "10", "16"], completed: ["#5 slab", "#6 slab", "#7 slab"] },
  { id: "c2", name: "Laguna Framing Crew", trade: "Framing", contact: "Marco Ruiz", phone: "956-555-0172", regular: true, houses: ["8", "9", "10"], completed: ["#5 frame", "#6 frame", "#7 frame"] },
  { id: "c3", name: "Gulf Coast Roofing", trade: "Roofing", contact: "Terry Nash", phone: "956-555-0188", regular: true, houses: ["6", "7"], completed: ["#5 roof dry-in"] },
  { id: "c4", name: "Salinas Electric", trade: "Electrical", contact: "Joel Salinas", phone: "956-555-0119", regular: true, houses: ["5", "6", "7"], completed: ["#5 rough-in"] },
  { id: "c5", name: "Bayside Plumbing", trade: "Plumbing", contact: "Dee Watts", phone: "956-555-0103", regular: true, houses: ["6", "7", "8"], completed: ["#5 top-out"] },
  { id: "c6", name: "Isla Air HVAC", trade: "HVAC", contact: "Ana Mora", phone: "956-555-0166", regular: true, houses: ["5", "6"], completed: ["#5 duct rough"] },
  { id: "c7", name: "Perez Drywall", trade: "Drywall", contact: "Luis Perez", phone: "956-555-0155", regular: true, houses: ["5"], completed: [] },
  { id: "c8", name: "Costa Painting", trade: "Paint", contact: "Ivan Costa", phone: "956-555-0132", regular: true, houses: ["5"], completed: [] },
  { id: "c9", name: "Padre Tile Works", trade: "Tile", contact: "Sam Ibarra", phone: "956-555-0147", regular: false, houses: ["5"], completed: [] },
  { id: "c10", name: "Port Glass & Door", trade: "Windows & Doors", contact: "Kelly Burns", phone: "956-555-0125", regular: true, houses: ["6", "7", "8"], completed: ["#5 windows"] },
  { id: "c11", name: "Verde Landscaping", trade: "Landscaping", contact: "Hugo Vela", phone: "956-555-0190", regular: false, houses: ["17", "18"], completed: [] },
  { id: "c12", name: "Cameron Site Work", trade: "Site Work", contact: "Billy Kane", phone: "956-555-0178", regular: true, houses: ["11", "12", "13", "16"], completed: ["#9 pad", "#10 pad"] },
];

export const houses: House[] = [
  { id: "5", kind: "home", stage: "Interior finishes", completion: 82, inspections: [{ name: "Framing", date: "Jul 10", result: "passed" }, { name: "Electrical rough", date: "Jul 24", result: "passed" }, { name: "Insulation", date: "Aug 14", result: "passed" }], photos: [{ caption: "Kitchen cabinets set", date: "Sep 16" }, { caption: "Master bath tile", date: "Sep 17" }], notes: "Punch walk planned for next Friday." },
  { id: "6", kind: "home", stage: "Rough-ins", completion: 58, inspections: [{ name: "Framing", date: "Aug 21", result: "passed" }, { name: "Plumbing top-out", date: "Sep 22", result: "scheduled" }], photos: [{ caption: "Duct runs upstairs", date: "Sep 15" }], notes: "Waiting on shower valves." },
  { id: "7", kind: "home", stage: "Rough-ins", completion: 51, inspections: [{ name: "Framing", date: "Aug 28", result: "passed" }], photos: [{ caption: "Roof dry-in", date: "Sep 12" }], notes: "" },
  { id: "8", kind: "home", stage: "Framing", completion: 34, inspections: [{ name: "Foundation", date: "Aug 05", result: "passed" }], photos: [{ caption: "Second floor decking", date: "Sep 18" }], notes: "Window order lands next week." },
  { id: "9", kind: "home", stage: "Slab poured", completion: 22, inspections: [{ name: "Foundation", date: "Sep 09", result: "passed" }], photos: [{ caption: "Slab pour", date: "Sep 09" }], notes: "" },
  { id: "10", kind: "home", stage: "Slab prep", completion: 15, inspections: [{ name: "Foundation", date: "Sep 23", result: "scheduled" }], photos: [], notes: "Plumbing under-slab needs sign-off first." },
  { id: "11", kind: "home", stage: "Pad grading", completion: 8, inspections: [], photos: [], notes: "" },
  { id: "12", kind: "home", stage: "Pad grading", completion: 6, inspections: [], photos: [], notes: "" },
  { id: "13", kind: "home", stage: "Cleared", completion: 4, inspections: [], photos: [], notes: "" },
  { id: "14", kind: "home", stage: "Not started", completion: 0, inspections: [], photos: [], notes: "" },
  { id: "15", kind: "home", stage: "Not started", completion: 0, inspections: [], photos: [], notes: "" },
  { id: "16", kind: "land", stage: "Parking base rock", completion: 40, inspections: [], photos: [{ caption: "Base rock spread", date: "Sep 17" }], notes: "Parking lot for #5–#9." },
  { id: "17", kind: "land", stage: "Land clearing", completion: 20, inspections: [], photos: [], notes: "" },
  { id: "18", kind: "land", stage: "Land clearing", completion: 10, inspections: [], photos: [], notes: "" },
];

export const tasks: Task[] = [
  { id: "t1", day: "today", contractorId: "c7", house: "5", task: "Finish texture in living room", status: "coming", time: "7:00" },
  { id: "t2", day: "today", contractorId: "c8", house: "5", task: "Prime upstairs bedrooms", status: "confirmed", time: "7:30" },
  { id: "t3", day: "today", contractorId: "c5", house: "6", task: "Plumbing top-out prep", status: "coming", time: "8:00" },
  { id: "t4", day: "today", contractorId: "c6", house: "6", task: "Hang air handler", status: "not_coming", time: "8:00" },
  { id: "t5", day: "today", contractorId: "c2", house: "8", task: "Second floor walls", status: "coming", time: "7:00" },
  { id: "t6", day: "today", contractorId: "c12", house: "11", task: "Grade pad and haul spoils", status: "completed", time: "6:30" },
  { id: "t7", day: "today", contractorId: "c1", house: "10", task: "Set forms for slab", status: "confirmed", time: "7:00" },
  { id: "t8", day: "tomorrow", contractorId: "c9", house: "5", task: "Master bath floor tile", status: "confirmed", time: "7:00" },
  { id: "t9", day: "tomorrow", contractorId: "c4", house: "6", task: "Electrical rough-in second floor", status: "not_confirmed", time: "7:30" },
  { id: "t10", day: "tomorrow", contractorId: "c5", house: "7", task: "Set tubs", status: "confirmed", time: "8:00" },
  { id: "t11", day: "tomorrow", contractorId: "c2", house: "8", task: "Roof trusses", status: "not_confirmed", time: "7:00" },
  { id: "t12", day: "tomorrow", contractorId: "c1", house: "10", task: "Pour slab", status: "confirmed", time: "6:30" },
  { id: "t13", day: "tomorrow", contractorId: "c12", house: "16", task: "Spread base rock at parking", status: "confirmed", time: "7:00" },
];

export const deliveries: Delivery[] = [
  { id: "d1", day: "today", what: "Drywall board — 120 sheets", house: "6", supplier: "Valley Building Supply", window: "9:00–11:00", status: "confirmed" },
  { id: "d2", day: "today", what: "Roof shingles", house: "7", supplier: "Gulf Coast Roofing", window: "1:00–3:00", status: "not_confirmed" },
  { id: "d3", day: "tomorrow", what: "Concrete — 42 yards", house: "10", supplier: "RGV Ready Mix", window: "6:30–9:00", status: "confirmed" },
  { id: "d4", day: "tomorrow", what: "Windows (8 units)", house: "8", supplier: "Port Glass & Door", window: "10:00–12:00", status: "not_confirmed" },
  { id: "d5", day: "tomorrow", what: "Base rock — 3 loads", house: "16", supplier: "Cameron Materials", window: "7:00–11:00", status: "confirmed" },
];

export const punchItems: PunchItem[] = [
  { id: "p1", what: "Touch up paint at stair rail", house: "5", contractorId: "c8", due: "Sep 25", done: false },
  { id: "p2", what: "Replace cracked outlet cover in kitchen", house: "5", contractorId: "c4", due: "Sep 22", done: false },
  { id: "p3", what: "Grout haze on guest bath floor", house: "5", contractorId: "c9", due: "Sep 30", done: false },
  { id: "p4", what: "Seal gap at rear door threshold", house: "6", contractorId: "c10", due: "Sep 19", done: false },
  { id: "p5", what: "Re-strap duct in attic", house: "6", contractorId: "c6", due: "Sep 26", done: false },
  { id: "p6", what: "Clean up framing scrap at side yard", house: "8", contractorId: "c2", due: "Sep 20", done: true },
  { id: "p7", what: "Fix low spot at driveway apron", house: "16", contractorId: "c1", due: "Oct 02", done: false },
];

export const moneyRows: Money[] = [
  { id: "m1", contractorId: "c1", house: "10", quoteNumber: "DC-2291", quote: 48500, additions: 3200, paid: 26000, method: "Check", lastPayment: "Sep 12" },
  { id: "m2", contractorId: "c2", house: "8", quoteNumber: "LF-1180", quote: 62000, additions: 0, paid: 31000, method: "ACH", lastPayment: "Sep 12" },
  { id: "m3", contractorId: "c4", house: "6", quoteNumber: "SE-0447", quote: 18900, additions: 1450, paid: 9000, method: "Check", lastPayment: "Sep 05" },
  { id: "m4", contractorId: "c5", house: "7", quoteNumber: "BP-3312", quote: 21400, additions: 0, paid: 21400, method: "ACH", lastPayment: "Aug 29" },
  { id: "m5", contractorId: "c7", house: "5", quoteNumber: "PD-0902", quote: 26750, additions: 900, paid: 12000, method: "Check", lastPayment: "Sep 12" },
  { id: "m6", contractorId: "c8", house: "5", quoteNumber: "CP-5521", quote: 14300, additions: 0, paid: 4000, method: "Zelle", lastPayment: "Sep 12" },
  { id: "m7", contractorId: "c12", house: "16", quoteNumber: "CS-7710", quote: 37800, additions: 5600, paid: 30000, method: "ACH", lastPayment: "Sep 12" },
];

export function contractorById(id: string) {
  return contractors.find((c) => c.id === id);
}

export function money(n: number) {
  return "$" + n.toLocaleString("en-US");
}

/** Accounting dates always land on a Friday. */
export function nearestFriday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const delta = (5 - day + 7) % 7;
  date.setDate(date.getDate() + delta);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}
