export function centsFromUsdString(value: string) {
  const clean = value.replace(/[^\d.]/g, "");
  if (!clean) return 0;

  const [dollars, frac = ""] = clean.split(".");
  const frac2 = (frac + "00").slice(0, 2);

  const result = parseInt(dollars || "0", 10) * 100 + parseInt(frac2 || "0", 10);

  return Number.isFinite(result) ? result : 0;
}

export function usdStringFromCents(cents: number) {
  const dollars = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, "0");
  return `${dollars}.${remainder}`;
}

export function formatUsdFromCents(cents?: number | null) {
  if (typeof cents !== "number") return "—";
  return `$${(cents / 100).toFixed(2)}`;
}
