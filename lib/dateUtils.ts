// ─── IST date utilities (frontend) ───────────────────────────────────────────
// All dates come from the API as UTC ISO strings.
// The app operates in IST (Asia/Kolkata, UTC+05:30).
// Use these helpers everywhere instead of bare new Date() / format() calls
// so behaviour is consistent regardless of the user's browser timezone.

import { format as dateFnsFormat } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const IST_TZ = "Asia/Kolkata";

/**
 * Convert a UTC ISO string from the API into an IST Date object.
 * Use this before passing to date-fns format() so the formatted string
 * always shows IST time, even for users in other timezones.
 */
export function toIST(utcIsoOrDate: string | Date): Date {
  const d = typeof utcIsoOrDate === "string" ? new Date(utcIsoOrDate) : utcIsoOrDate;
  try {
    return toZonedTime(d, IST_TZ);
  } catch {
    // fallback if date-fns-tz not available — browser handles IST correctly
    // for users in India; this is a no-op safety net
    return d;
  }
}

/**
 * Format a UTC date string as IST for display.
 * drop-in replacement for: format(new Date(str), pattern)
 */
export function formatIST(utcIsoOrDate: string | Date, pattern: string): string {
  if (!utcIsoOrDate) return "—";
  try {
    return dateFnsFormat(toIST(utcIsoOrDate), pattern);
  } catch {
    return "—";
  }
}

/**
 * Convert a UTC ISO string from the DB into a datetime-local input value in IST.
 * e.g. "2025-06-09T18:30:00Z" → "2025-06-10T00:00"
 */
export function utcToISTLocal(utcIso: string): string {
  if (!utcIso) return "";
  const d = new Date(utcIso);
  return d
    .toLocaleString("sv-SE", {
      timeZone: IST_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(" ", "T");
}

/**
 * Convert a datetime-local input value (no timezone) to a full ISO string
 * with IST offset, so the server stores the exact time the user intended.
 * e.g. "2025-06-10T00:00" → "2025-06-10T00:00:00+05:30"
 */
export function istLocalToISO(localStr: string): string {
  if (!localStr) return "";
  return `${localStr}:00+05:30`;
}

/**
 * Display a date in IST using Intl — no date-fns dependency needed.
 * Returns { date: "10 Jun 2025", time: "8:00 am", dateTime: "10 Jun 2025, 8:00 am" }
 */
export function toISTDisplay(utcIsoOrDate: string | Date) {
  if (!utcIsoOrDate) return { date: "—", time: "—", dateTime: "—" };
  const d = typeof utcIsoOrDate === "string" ? new Date(utcIsoOrDate) : utcIsoOrDate;
  if (isNaN(d.getTime())) return { date: "—", time: "—", dateTime: "—" };
  const opts = { timeZone: IST_TZ } as const;
  return {
    date: d.toLocaleDateString("en-IN", { ...opts, day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { ...opts, hour: "numeric", minute: "2-digit", hour12: true }),
    dateTime: d.toLocaleString("en-IN", { ...opts, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
  };
}
