// src/lib/usage.ts
import { prisma } from "../db/prisma.js";
import { COUNTED_STATUSES } from "../policy/limits.js";
import { startOfUtcDay, startOfUtcIsoWeek } from "./time.js";

export async function getUsageCents(userId: string) {
  const now = new Date();
  const dayStart = startOfUtcDay(now);
  const weekStart = startOfUtcIsoWeek(now);

  const dailyAgg = await prisma.conversion.aggregate({
    where: {
      userId,
      status: { in: COUNTED_STATUSES as any },
      createdAt: { gte: dayStart },
    },
    _sum: { sourceAmountUsd: true },
  });

  const weeklyAgg = await prisma.conversion.aggregate({
    where: {
      userId,
      status: { in: COUNTED_STATUSES as any },
      createdAt: { gte: weekStart },
    },
    _sum: { sourceAmountUsd: true },
  });

  return {
    dailyUsedCents: dailyAgg._sum.sourceAmountUsd ?? 0,
    weeklyUsedCents: weeklyAgg._sum.sourceAmountUsd ?? 0,
    dayStart,
    weekStart,
  };
}
