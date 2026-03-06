// src/lib/xrp.ts
import type { Prisma } from "@prisma/client";

/**
 * Convert XRP amount (string/number/Decimal) to drops (bigint) by flooring to 6 decimals.
 * 1 XRP = 1,000,000 drops.
 */
export function xrpToDrops(xrp: string | number | Prisma.Decimal): bigint {
  const s = String(xrp).trim();
  if (!s || s === "NaN") return 0n;

  const neg = s.startsWith("-");
  const raw = neg ? s.slice(1) : s;

  const [wholePart, fracPartRaw = ""] = raw.split(".");
  const whole = wholePart === "" ? "0" : wholePart;

  // pad/truncate to 6 decimals (drops)
  const frac = (fracPartRaw + "000000").slice(0, 6);

  const dropsStr = `${whole}${frac}`.replace(/^0+/, "") || "0";
  const drops = BigInt(dropsStr);

  return neg ? -drops : drops;
}

export function dropsToXrpString(drops: bigint): string {
  const neg = drops < 0n;
  const abs = neg ? -drops : drops;

  const whole = abs / 1_000_000n;
  const frac = abs % 1_000_000n;

  const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
  const out = fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString();

  return neg ? `-${out}` : out;
}
