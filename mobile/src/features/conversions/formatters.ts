export function formatUsd(cents?: number | null) {
  if (typeof cents !== "number") return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export function prettifyStatus(status?: string | null) {
  if (!status) return "Unknown";
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function shortProviderName(provider?: string | null) {
  if (!provider) return "provider";
  const p = provider.toLowerCase();
  if (p.includes("mock")) return "provider";
  if (p.includes("sandbox")) return "provider";
  return provider;
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function safeJson(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function formatDurationMs(ms: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "Calculating…";

  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  if (mins <= 0) return `~${secs}s remaining`;
  if (mins < 60) return `~${mins}m ${secs}s remaining`;

  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `~${hours}h ${remMins}m remaining`;
}

export function estimateRemainingMs(percent?: number | null, createdAt?: string | null, isTerminal?: boolean) {
  if (isTerminal) return 0;
  if (typeof percent !== "number") return null;
  if (percent <= 0 || percent >= 100) return null;
  if (!createdAt) return null;

  const startedAt = new Date(createdAt).getTime();
  if (!Number.isFinite(startedAt)) return null;

  const elapsed = Date.now() - startedAt;
  if (elapsed <= 0) return null;

  const rate = percent / elapsed;
  if (rate <= 0) return null;

  const remainingPercent = 100 - percent;
  return remainingPercent / rate;
}
