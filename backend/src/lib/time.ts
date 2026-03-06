// src/lib/time.ts
export function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

// ISO week starts Monday
export function startOfUtcIsoWeek(d = new Date()) {
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diffToMon = (day + 6) % 7; // Mon->0, Sun->6
  const start = startOfUtcDay(d);
  start.setUTCDate(start.getUTCDate() - diffToMon);
  return start;
}
