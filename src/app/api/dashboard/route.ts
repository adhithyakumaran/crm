import { NextResponse } from "next/server";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";
import { PIPELINE_STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const userId = auth.userId;
  const now = new Date();

  const [total, statusGroups, followToday, followOverdue, followUpcoming] =
    await Promise.all([
      prisma.lead.count({ where: { userId, archived: false } }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { userId, archived: false },
        _count: true,
      }),
      prisma.lead.count({
        where: {
          userId,
          archived: false,
          nextFollowUpAt: { gte: startOfDay(now), lte: endOfDay(now) },
        },
      }),
      prisma.lead.count({
        where: {
          userId,
          archived: false,
          nextFollowUpAt: { lt: startOfDay(now) },
        },
      }),
      prisma.lead.count({
        where: {
          userId,
          archived: false,
          nextFollowUpAt: { gt: endOfDay(now) },
        },
      }),
    ]);

  const byStatus = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count])
  );

  const pipeline = PIPELINE_STATUSES.map((status) => ({
    status,
    count: byStatus[status] ?? 0,
  }));

  return NextResponse.json({
    kpis: {
      total,
      new: byStatus.NEW ?? 0,
      toContact: (byStatus.NEW ?? 0) + (byStatus.REVIEWED ?? 0),
      contacted: byStatus.CONTACTED ?? 0,
      responded: byStatus.RESPONDED ?? 0,
      followUpsDue: followToday + followOverdue,
      meetings: byStatus.MEETING ?? 0,
      proposals: byStatus.PROPOSAL ?? 0,
      won: byStatus.WON ?? 0,
      lost: byStatus.LOST ?? 0,
    },
    followUps: { today: followToday, overdue: followOverdue, upcoming: followUpcoming },
    pipeline,
  });
}
