export function formatUsd(cents?: number | null) {
  if (typeof cents !== "number") return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatXrp(xrp?: number | string | null) {
  if (xrp == null) return "—";

  const n = typeof xrp === "string" ? Number(xrp) : xrp;
  if (!Number.isFinite(n)) return String(xrp);

  return `${n.toFixed(2)} XRP`;
}

export function prettifyStatus(status?: string | null) {
  if (!status) return "Unknown";

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";

  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
