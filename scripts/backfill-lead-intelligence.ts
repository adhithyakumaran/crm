/**
 * Backfill sales intelligence on existing leads + ingest active demand.
 * Run: npx tsx scripts/backfill-lead-intelligence.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { ensureDefaultUser } from "../src/lib/auth/default-user";
import {
  computeIntentScore,
  enrichBusinessOpportunityLead,
  normalizeOpportunityType,
} from "../src/lib/leads/intelligence";
import { upsertLeadFromImport, type IncomingLeadRow } from "../src/lib/leads/upsert";
import { ACTIVE_DEMAND_LEADS } from "./active-demand-leads";

function mapLegacyOpportunity(
  t: string | null | undefined
): IncomingLeadRow["opportunityType"] {
  return normalizeOpportunityType(t ?? undefined);
}

async function backfillExisting(userId: string) {
  const leads = await prisma.lead.findMany({
    where: { userId },
    include: { contacts: { where: { isPrimary: true }, take: 1 } },
  });

  let updated = 0;
  for (const lead of leads) {
    if (lead.leadIntelCategory === "ACTIVE_DEMAND") continue;

    const contact = lead.contacts[0];
    const websiteStatus =
      (lead.digitalPresence as { websiteStatus?: string } | null)?.websiteStatus ??
      undefined;

    const enriched = enrichBusinessOpportunityLead({
      businessName: lead.businessName,
      industry: lead.industry ?? lead.category ?? undefined,
      website: lead.website,
      websiteStatus,
      detectedProblem: lead.detectedProblem,
      city: lead.city,
    });

    const row: IncomingLeadRow = {
      businessName: lead.businessName,
      city: lead.city,
      detectedProblem: lead.detectedProblem ?? undefined,
      solutionNeeded: lead.solutionNeeded ?? enriched.solutionNeeded,
      suggestedSolution: lead.suggestedSolution ?? enriched.solutionNeeded,
      businessOpportunity:
        lead.businessOpportunity ?? lead.suggestedService ?? enriched.businessOpportunity,
      suggestedService: lead.suggestedService ?? enriched.businessOpportunity,
      whyThisLead: lead.whyThisLead ?? enriched.whyThisLead,
      projectType: lead.projectType ?? enriched.projectType,
      buyingIntent: lead.buyingIntent ?? enriched.buyingIntent,
      opportunityType:
        mapLegacyOpportunity(lead.opportunityType) ?? lead.opportunityType,
      leadIntelCategory: lead.leadIntelCategory ?? "BUSINESS_OPPORTUNITY",
      leadScore: lead.leadScore,
      phone: contact?.phone,
      email: contact?.email,
    };

    await upsertLeadFromImport(userId, row, "API");
    updated++;
  }
  return updated;
}

async function ingestActiveDemand(userId: string) {
  const stats = { created: 0, updated: 0 };
  for (const base of ACTIVE_DEMAND_LEADS) {
    const intentScore = computeIntentScore({
      postedAt: base.postedAt,
      requirementText: `${base.requirementSummary ?? ""} ${base.postTextSummary ?? ""}`,
      hasContact: Boolean(base.phone || base.email),
      hasDecisionMaker: Boolean(base.postAuthor),
    });

    const enriched = enrichBusinessOpportunityLead({
      businessName: base.businessName,
      industry: base.industry,
      website: base.website,
      detectedProblem: base.detectedProblem,
      city: base.city,
    });

    const row: IncomingLeadRow = {
      ...base,
      intentScore,
      leadScore: Math.max(base.leadScore ?? 0, Math.min(100, intentScore + 15)),
      solutionNeeded: base.solutionNeeded ?? enriched.solutionNeeded,
      suggestedSolution: base.suggestedSolution ?? enriched.solutionNeeded,
      businessOpportunity:
        base.businessOpportunity ?? enriched.businessOpportunity,
      suggestedService: base.suggestedService ?? enriched.businessOpportunity,
      whyThisLead:
        base.whyThisLead ??
        `Public ${base.postPlatform ?? "social"} post (${base.postedAt ?? "recent"}) states an explicit development requirement: ${base.requirementSummary ?? base.postTextSummary}`,
      projectType: base.projectType ?? enriched.projectType,
      buyingIntent:
        intentScore >= 70
          ? "VERY_HIGH"
          : intentScore >= 50
            ? "HIGH"
            : base.buyingIntent ?? "MEDIUM",
    };

    const result = await upsertLeadFromImport(userId, row, "API");
    if (result.action === "created") stats.created++;
    else stats.updated++;
  }
  return stats;
}

async function main() {
  const userId = await ensureDefaultUser();
  const backfilled = await backfillExisting(userId);
  const active = await ingestActiveDemand(userId);

  const counts = await prisma.lead.groupBy({
    by: ["leadIntelCategory"],
    where: { userId },
    _count: true,
  });

  console.log(
    JSON.stringify(
      {
        backfilled,
        activeDemand: active,
        byCategory: counts,
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
