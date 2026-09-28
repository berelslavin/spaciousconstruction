import { createFileRoute, redirect } from "@tanstack/react-router";

// The machine app is the front door; the rest of the board lives behind /today.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/equipment" });
  },
  head: () => ({
    meta: [
      { title: "Spacious Bay Field — Machines" },
      { name: "description", content: "Check out, transfer, return and report issues on Spacious Bay machines." },
      { property: "og:title", content: "Spacious Bay Field — Machines" },
      { property: "og:description", content: "Check out, transfer, return and report issues on Spacious Bay machines." },
    ],
  }),
});
