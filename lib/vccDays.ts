// Event days exactly as VCC computes them (VCC lib/utils/event-days.ts), from
// the form's IST datetime-local values ("YYYY-MM-DDTHH:mm").
//  - The opening day is the plain IST calendar date of the start.
//  - The closing day honours VCC's 01:00 IST boundary: an event ending at
//    00:30 belongs to the previous day, so no phantom day is created.
// Time slots are keyed by these dates, so they MUST match VCC's keys.

const DAY_START_HOUR_IST = 1;

function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function vccEventDayKeys(startLocal?: string, endLocal?: string): string[] {
  if (!startLocal || !endLocal) return [];
  const startKey = startLocal.slice(0, 10);
  let endKey = endLocal.slice(0, 10);
  const endHour = Number(endLocal.slice(11, 13));
  if (Number.isFinite(endHour) && endHour < DAY_START_HOUR_IST) endKey = addDays(endKey, -1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey) || endKey < startKey) return [];
  const keys: string[] = [];
  for (let k = startKey; k <= endKey && keys.length < 60; k = addDays(k, 1)) keys.push(k);
  return keys;
}

export function dayLabel(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
