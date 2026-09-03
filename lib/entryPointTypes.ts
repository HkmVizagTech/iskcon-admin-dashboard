// ─── Entry-point type labels (Jhulan rename) ──────────────────────────────────
// "darshan" is deliberately absent from the selectable list — the gate is now
// Jhulan and nothing new should be created as darshan. Entry points on past
// events still carry the old value; they display via LEGACY_TYPE_LABELS below
// rather than appearing as a choice in the form.
//
// Lives in its own module (not in the entry-points page.tsx) because a Next.js
// App Router page.tsx is type-checked against a framework-generated shape for
// its exports — an extra non-component export there fails to typecheck
// (TS2344). Nothing about that constraint applies to a plain lib module.

// NOT `as const` — kept as a plain mutable array of { value: string; label:
// string } so it assigns directly to the Select component's `options` prop,
// exactly like the original inline declaration this replaced.
export const entryPointTypes = [
  { value: "venue_entry", label: "🚪 Venue Entry" },
  { value: "jhulan", label: "🙏 Jhulan" },
  { value: "prasadam", label: "🍛 Prasadam" },
  { value: "bahumana", label: "🎁 Bahumana" },
  { value: "vip_seat", label: "⭐ VIP Seat" },
  { value: "custom", label: "📍 Custom" },
];

// Read-only labels for values that are no longer offered, so a past event's
// gate still renders with a proper name instead of a blank select.
export const LEGACY_TYPE_LABELS: Record<string, string> = {
  darshan: "🙏 Darshan (legacy)",
};

export function entryPointTypeLabel(value: string): string {
  return (
    entryPointTypes.find((t) => t.value === value)?.label ||
    LEGACY_TYPE_LABELS[value] ||
    value
  );
}
