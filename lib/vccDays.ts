// Display label for a VCC event-day key ("yyyy-MM-dd"), e.g. "Sunday, 20 December".
export function dayLabel(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
