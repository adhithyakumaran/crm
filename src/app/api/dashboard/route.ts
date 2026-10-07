import { NextResponse } from "next/server";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";
import { PIPELINE_STATUSES } from "@/lib/constants";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const userId = auth.userId;
  const now = new Date();

  const sevenDaysAgo = subDays(now, 7);

  const [
    total,
    statusGroups,
    followToday,
    followOverdue,
    followUpcoming,
    activeDemand,
    businessOpportunity,
    postedLast7,
    hottestDemand,
  ] = await Promise.all([
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
      prisma.lead.count({
        where: {
          userId,
          archived: false,
          leadIntelCategory: { in: ["ACTIVE_DEMAND", "BOTH"] },
        },
      }),
      prisma.lead.count({
        where: {
          userId,
          archived: false,
          leadIntelCategory: "BUSINESS_OPPORTUNITY",
        },
      }),
      prisma.lead.count({
        where: {
          userId,
          archived: false,
          postedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.lead.findMany({
        where: {
          userId,
          archived: false,
          leadIntelCategory: { in: ["ACTIVE_DEMAND", "BOTH"] },
        },
        orderBy: [{ intentScore: "desc" }, { postedAt: "desc" }],
        take: 8,
        include: { contacts: { where: { isPrimary: true }, take: 1 } },
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
    intelligence: {
      activeDemand,
      businessOpportunity,
      postedLast7,
      hottestDemand: hottestDemand.map((l) => ({
        id: l.id,
        businessName: l.businessName,
        intentScore: l.intentScore,
        leadScore: l.leadScore,
        requirementSummary: l.requirementSummary,
        postedAt: l.postedAt,
        phone: l.contacts[0]?.phone,
      })),
    },
    pipeline,
  });
}
