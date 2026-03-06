import { formatDateTime, formatUsd, prettifyStatus, safeJson } from "@/src/lib/format";

export { formatDateTime, formatUsd, prettifyStatus, safeJson };

export function shortProviderName(provider?: string | null) {
  if (!provider) return "provider";

  const normalized = provider.toLowerCase();

  if (normalized.includes("mock")) return "provider";
  if (normalized.includes("sandbox")) return "provider";

  return provider;
}

export function formatDurationMs(ms: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return "Calculating…";
  }

  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  if (mins <= 0) return `~${secs}s remaining`;
  if (mins < 60) return `~${mins}m ${secs}s remaining`;

  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;

  return `~${hours}h ${remMins}m remaining`;
}

export function estimateRemainingMs(
  percent?: number | null,
  createdAt?: string | null,
  isTerminal?: boolean,
) {
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
