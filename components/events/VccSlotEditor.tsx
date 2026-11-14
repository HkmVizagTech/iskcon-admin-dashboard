"use client";

import { Plus, Trash2, CalendarClock } from "lucide-react";
import { dayLabel } from "@/lib/vccDays";
import Button from "@/components/ui/Button";

// Per-day availability time slots for a VCC event — the same structure VCC's
// own admin form saves: [{ date: "yyyy-MM-dd", slots: [{ startTime, endTime, label }] }].
// Used by the Create Event form and the Edit Event "Volunteers (VCC)" card.

export type TimeSlot = { startTime: string; endTime: string; label: string };
export type DaySlots = { date: string; slots: TimeSlot[] };

const MAX_PER_DAY = 4;

const inputCls =
  "px-3 py-2 border border-gray-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-orange-500";

/** First problem that would make VCC drop a slot, or null. */
export function slotsProblem(days: DaySlots[]): string | null {
  for (const d of days) {
    for (const s of d.slots) {
      if (!s.startTime || !s.endTime) return `Fill both start and end time for every slot on ${dayLabel(d.date)}`;
      if (s.endTime <= s.startTime) return `A slot on ${dayLabel(d.date)} ends before it starts`;
    }
  }
  return null;
}

/** Payload shape for VCC; drops empty days and days outside `keep` (if given). */
export function cleanSlots(days: DaySlots[], keep?: Set<string> | null) {
  return days
    .filter((d) => !keep || keep.has(d.date))
    .map((d) => ({
      date: d.date,
      slots: d.slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime, label: s.label.trim() || undefined })),
    }))
    .filter((d) => d.slots.length > 0);
}

/** VCC's stored slots → editor state. */
export function fromVccSlots(raw: any): DaySlots[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d: any) => ({
    date: String(d.date),
    slots: (d.slots || []).map((s: any) => ({
      startTime: s.startTime || "",
      endTime: s.endTime || "",
      label: s.label || "",
    })),
  }));
}

export default function VccSlotEditor({
  dayKeys,
  value,
  onChange,
}: {
  /** Event days ("yyyy-MM-dd", IST) — see lib/vccDays. */
  dayKeys: string[];
  value: DaySlots[];
  onChange: (v: DaySlots[]) => void;
}) {
  if (dayKeys.length === 0) {
    return (
      <div className="flex gap-3 rounded-lg border border-dashed border-orange-200 bg-orange-50/50 px-3 py-3 text-sm text-gray-700">
        <CalendarClock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <p>
          Fill the event <b>Start</b> and <b>End</b> above — <b>both the date and the time</b>. The event
          days will then appear here to add slots.
        </p>
      </div>
    );
  }

  const daySlots = (date: string) => value.find((d) => d.date === date)?.slots || [];
  const setDaySlots = (date: string, slots: TimeSlot[]) => {
    const next = value.filter((d) => d.date !== date);
    if (slots.length) next.push({ date, slots });
    next.sort((a, b) => a.date.localeCompare(b.date));
    onChange(next);
  };
  const copyToAllDays = (date: string) => {
    const slots = daySlots(date);
    onChange(dayKeys.map((d) => ({ date: d, slots: slots.map((s) => ({ ...s })) })));
  };
  const outside = value.filter((d) => !dayKeys.includes(d.date) && d.slots.length > 0);

  return (
    <div className="space-y-3">
      {dayKeys.map((date) => {
        const slots = daySlots(date);
        return (
          <div key={date} className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-800">{dayLabel(date)}</p>
              {dayKeys.length > 1 && slots.length > 0 && (
                <button
                  type="button"
                  onClick={() => copyToAllDays(date)}
                  className="text-xs text-orange-600 hover:underline py-1.5 -my-1.5 whitespace-nowrap"
                >
                  Copy to all days
                </button>
              )}
            </div>
            {slots.length === 0 && <p className="text-xs text-gray-400">No slots for this day.</p>}
            {slots.map((slot, i) => (
              // Phones: [start] to [end] [delete] on one line, label below.
              // Desktop: everything on one line.
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap"
              >
                <input
                  type="time"
                  value={slot.startTime}
                  aria-label="Start time"
                  onChange={(e) => setDaySlots(date, slots.map((s, j) => (j === i ? { ...s, startTime: e.target.value } : s)))}
                  className={`${inputCls} w-full min-w-0 sm:w-32`}
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="time"
                  value={slot.endTime}
                  aria-label="End time"
                  onChange={(e) => setDaySlots(date, slots.map((s, j) => (j === i ? { ...s, endTime: e.target.value } : s)))}
                  className={`${inputCls} w-full min-w-0 sm:w-32`}
                />
                <button
                  type="button"
                  onClick={() => setDaySlots(date, slots.filter((_, j) => j !== i))}
                  className="p-2.5 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg sm:order-last"
                  title="Remove slot"
                  aria-label="Remove slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  value={slot.label}
                  placeholder="Label (optional), e.g. Morning"
                  onChange={(e) => setDaySlots(date, slots.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))}
                  className={`${inputCls} col-span-4 w-full sm:w-auto sm:flex-1 sm:min-w-[140px]`}
                />
              </div>
            ))}
            {slots.length < MAX_PER_DAY && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDaySlots(date, [...slots, { startTime: "", endTime: "", label: "" }])}
              >
                <Plus className="w-4 h-4 mr-1" /> Add slot
              </Button>
            )}
          </div>
        );
      })}
      {outside.length > 0 && (
        <p className="text-xs text-amber-700">
          {outside.length} day(s) with slots are outside the event dates ({outside.map((d) => d.date).join(", ")}) and
          will be removed when you save.
        </p>
      )}
    </div>
  );
}
