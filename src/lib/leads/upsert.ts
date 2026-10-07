import type {
  BuyingIntent,
  FieldSource,
  Lead,
  LeadIntelCategory,
  LeadSourceType,
  LeadStatus,
  OpportunityType,
  Prisma,
  ProjectType,
} from "@prisma/client";
import { normalizeOpportunityType } from "@/lib/leads/intelligence";
import { prisma } from "@/lib/db";
import {
  canOverwriteField,
  parseFieldMeta,
  PROTECTED_CRM_FIELDS,
  withFieldMeta,
  type FieldMetaMap,
} from "@/lib/leads/field-meta";
import { findMatchingLead } from "@/lib/leads/match";
import {
  extractDomain,
  normalizeEmail,
  normalizePhone,
} from "@/lib/leads/normalize";

export type IncomingLeadRow = {
  businessName: string;
  category?: string | null;
  industry?: string | null;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  location?: string | null;
  googleMapsUrl?: string | null;
  website?: string | null;
  businessSize?: string | null;
  status?: LeadStatus | null;
  leadScore?: number | null;
  scoreReason?: string | null;
  detectedProblem?: string | null;
  suggestedSolution?: string | null;
  solutionNeeded?: string | null;
  suggestedService?: string | null;
  suggestedPitch?: string | null;
  opportunityType?: OpportunityType | null;
  opportunityTypes?: string[] | null;
  businessValue?: string | null;
  businessOpportunity?: string | null;
  whyThisLead?: string | null;
  leadIntelCategory?: LeadIntelCategory | null;
  buyingIntent?: BuyingIntent | null;
  intentScore?: number | null;
  projectType?: ProjectType | null;
  postedAt?: string | Date | null;
  postUrl?: string | null;
  postPlatform?: string | null;
  postAuthor?: string | null;
  postAuthorRole?: string | null;
  postTextSummary?: string | null;
  requirementSummary?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  phone?: string | null;
  whatsApp?: string | null;
  email?: string | null;
  linkedIn?: string | null;
  sourceType?: LeadSourceType | null;
  sourceUrl?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  websiteStatus?: string | null;
  digitalPresence?: Record<string, unknown> | null;
  social?: Record<string, unknown> | null;
  evidence?: unknown[] | null;
};

function mergeScalar(
  field: string,
  current: string | null | undefined,
  incoming: string | null | undefined,
  meta: FieldMetaMap,
  source: FieldSource
): { value: string | null | undefined; meta: FieldMetaMap } {
  if (PROTECTED_CRM_FIELDS.has(field)) {
    return { value: current, meta };
  }
  if (!incoming?.trim()) return { value: current, meta };
  if (current?.trim() && !canOverwriteField(meta, field, source)) {
    return { value: current, meta };
  }
  return {
    value: incoming.trim(),
    meta: withFieldMeta(meta, { [field]: source }),
  };
}

function mergeNumber(
  field: string,
  current: number,
  incoming: number | null | undefined,
  meta: FieldMetaMap,
  source: FieldSource
): { value: number; meta: FieldMetaMap } {
  if (incoming == null || Number.isNaN(incoming)) return { value: current, meta };
  if (current > 0 && !canOverwriteField(meta, field, source)) {
    return { value: current, meta };
  }
  return {
    value: incoming,
    meta: withFieldMeta(meta, { [field]: source }),
  };
}

export async function upsertLeadFromImport(
  userId: string,
  row: IncomingLeadRow,
  source: FieldSource,
  importId?: string
): Promise<{ action: "created" | "updated"; leadId: string; matchReason?: string }> {
  const phone = normalizePhone(row.phone ?? row.whatsApp);
  const email = normalizeEmail(row.email);
  const domain = extractDomain(row.website);

  const match = await findMatchingLead(userId, {
    businessName: row.businessName,
    website: row.website,
    phone: row.phone ?? row.whatsApp,
    email: row.email,
    city: row.city,
    address: row.address,
  });

  const social = {
    ...(row.social ?? {}),
    ...(row.instagram ? { instagram: row.instagram } : {}),
    ...(row.facebook ? { facebook: row.facebook } : {}),
    ...(row.linkedIn ? { linkedIn: row.linkedIn } : {}),
  };

  const digitalPresence = {
    ...(row.digitalPresence ?? {}),
    ...(row.websiteStatus ? { websiteStatus: row.websiteStatus } : {}),
  };

  if (!match) {
    const lead = await prisma.lead.create({
      data: {
        userId,
        businessName: row.businessName.trim(),
        category: row.category ?? undefined,
        industry: row.industry ?? row.category ?? undefined,
        description: row.description ?? undefined,
        city: row.city ?? undefined,
        state: row.state ?? undefined,
        country: row.country ?? "India",
        address: row.address ?? undefined,
        location:
          row.location ??
          ([row.city, row.state].filter(Boolean).join(", ") || undefined),
        googleMapsUrl: row.googleMapsUrl ?? undefined,
        website: row.website ?? undefined,
        websiteDomain: domain ?? undefined,
        businessSize: row.businessSize ?? undefined,
        status: row.status && source !== "USER" ? row.status : "NEW",
        leadScore: row.leadScore ?? 0,
        scoreReason: row.scoreReason ?? undefined,
        detectedProblem: row.detectedProblem ?? undefined,
        suggestedSolution:
          row.suggestedSolution ?? row.solutionNeeded ?? undefined,
        solutionNeeded: row.solutionNeeded ?? row.suggestedSolution ?? undefined,
        suggestedService: row.suggestedService ?? undefined,
        suggestedPitch: row.suggestedPitch ?? undefined,
        opportunityType:
          normalizeOpportunityType(row.opportunityType ?? undefined) ??
          row.opportunityType ??
          undefined,
        opportunityTypes: row.opportunityTypes?.length
          ? row.opportunityTypes
          : undefined,
        businessValue: row.businessValue ?? undefined,
        businessOpportunity: row.businessOpportunity ?? undefined,
        whyThisLead: row.whyThisLead ?? undefined,
        leadIntelCategory: row.leadIntelCategory ?? "BUSINESS_OPPORTUNITY",
        buyingIntent: row.buyingIntent ?? "UNKNOWN",
        intentScore: row.intentScore ?? 0,
        projectType: row.projectType ?? undefined,
        postedAt: row.postedAt ? new Date(row.postedAt) : undefined,
        postUrl: row.postUrl ?? undefined,
        postPlatform: row.postPlatform ?? undefined,
        postAuthor: row.postAuthor ?? undefined,
        postAuthorRole: row.postAuthorRole ?? undefined,
        postTextSummary: row.postTextSummary ?? undefined,
        requirementSummary: row.requirementSummary ?? undefined,
        digitalPresence: Object.keys(digitalPresence).length ? digitalPresence : undefined,
        social: Object.keys(social).length ? social : undefined,
        evidence: row.evidence ? (row.evidence as Prisma.InputJsonValue) : undefined,
        normalizedPhone: phone ?? undefined,
        normalizedEmail: email ?? undefined,
        isHot:
          (row.intentScore ?? 0) >= 90 ||
          (row.leadScore ?? 0) >= 90 ||
          row.leadIntelCategory === "ACTIVE_DEMAND",
        fieldMeta: withFieldMeta(
          {},
          Object.fromEntries(
            ["businessName", "phone", "email", "website", "leadScore"].map((f) => [f, source])
          ) as Record<string, FieldSource>
        ),
        contacts: {
          create: {
            name: row.contactName ?? undefined,
            role: row.contactRole ?? undefined,
            phone: row.phone ?? undefined,
            whatsApp: row.whatsApp ?? row.phone ?? undefined,
            email: row.email ?? undefined,
            linkedIn: row.linkedIn ?? undefined,
            isPrimary: true,
          },
        },
        sources: row.sourceType
          ? {
              create: {
                type: row.sourceType,
                sourceUrl: row.sourceUrl ?? undefined,
              },
            }
          : undefined,
        activities: {
          create: {
            type: "IMPORTED",
            title: "Lead imported",
            description: importId ? `Import ${importId}` : "Lead created via ingestion",
          },
        },
      },
    });

    return { action: "created", leadId: lead.id };
  }

  const existing = await prisma.lead.findUnique({
    where: { id: match.leadId },
    include: { contacts: { where: { isPrimary: true }, take: 1 } },
  });
  if (!existing) {
    throw new Error("Matched lead missing");
  }

  let meta = parseFieldMeta(existing.fieldMeta);
  const data: Prisma.LeadUpdateInput = {};
  const scalarFields: Array<keyof IncomingLeadRow> = [
    "category",
    "industry",
    "description",
    "city",
    "state",
    "country",
    "address",
    "location",
    "googleMapsUrl",
    "website",
    "businessSize",
    "scoreReason",
    "detectedProblem",
    "suggestedSolution",
    "suggestedService",
    "suggestedPitch",
    "businessValue",
    "solutionNeeded",
    "businessOpportunity",
    "whyThisLead",
    "postUrl",
    "postPlatform",
    "postAuthor",
    "postAuthorRole",
    "postTextSummary",
    "requirementSummary",
  ];

  for (const field of scalarFields) {
    const incoming = row[field] as string | null | undefined;
    const current = existing[field as keyof Lead] as string | null | undefined;
    const merged = mergeScalar(field, current, incoming, meta, source);
    meta = merged.meta;
    if (merged.value !== current && merged.value != null) {
      (data as Record<string, unknown>)[field] = merged.value;
    }
  }

  const scoreMerged = mergeNumber("leadScore", existing.leadScore, row.leadScore, meta, source);
  meta = scoreMerged.meta;
  if (scoreMerged.value !== existing.leadScore) {
    data.leadScore = scoreMerged.value;
    data.isHot = scoreMerged.value >= 90;
  }

  if (domain && (!existing.websiteDomain || canOverwriteField(meta, "website", source))) {
    data.websiteDomain = domain;
    meta = withFieldMeta(meta, { website: source });
  }
  if (phone && (!existing.normalizedPhone || canOverwriteField(meta, "phone", source))) {
    data.normalizedPhone = phone;
  }
  if (email && (!existing.normalizedEmail || canOverwriteField(meta, "email", source))) {
    data.normalizedEmail = email;
  }

  if (Object.keys(digitalPresence).length) {
    data.digitalPresence = {
      ...(existing.digitalPresence as object),
      ...digitalPresence,
    };
  }
  if (Object.keys(social).length) {
    data.social = { ...(existing.social as object), ...social };
  }
  if (row.evidence?.length) {
    data.evidence = row.evidence as Prisma.InputJsonValue;
  }
  if (row.opportunityType && canOverwriteField(meta, "opportunityType", source)) {
    data.opportunityType =
      normalizeOpportunityType(row.opportunityType) ?? row.opportunityType;
    meta = withFieldMeta(meta, { opportunityType: source });
  }
  if (row.opportunityTypes?.length) {
    data.opportunityTypes = row.opportunityTypes;
  }
  if (row.suggestedSolution && canOverwriteField(meta, "suggestedSolution", source)) {
    data.suggestedSolution = row.suggestedSolution;
  }
  if (row.solutionNeeded && canOverwriteField(meta, "solutionNeeded", source)) {
    data.solutionNeeded = row.solutionNeeded;
  }
  if (row.leadIntelCategory && canOverwriteField(meta, "leadIntelCategory", source)) {
    data.leadIntelCategory = row.leadIntelCategory;
  }
  if (row.buyingIntent && canOverwriteField(meta, "buyingIntent", source)) {
    data.buyingIntent = row.buyingIntent;
  }
  const intentMerged = mergeNumber(
    "intentScore",
    existing.intentScore,
    row.intentScore,
    meta,
    source
  );
  meta = intentMerged.meta;
  if (intentMerged.value !== existing.intentScore) {
    data.intentScore = intentMerged.value;
  }
  if (row.projectType && canOverwriteField(meta, "projectType", source)) {
    data.projectType = row.projectType;
  }
  if (row.postedAt) {
    data.postedAt = new Date(row.postedAt);
  }

  data.fieldMeta = meta;

  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: {
      ...data,
      activities: {
        create: {
          type: "IMPORTED",
          title: "Lead updated from import",
          description: `Matched by ${match.reason}`,
          metadata: { importId, matchReason: match.reason },
        },
      },
      sources: row.sourceType
        ? {
            create: {
              type: row.sourceType,
              sourceUrl: row.sourceUrl ?? undefined,
            },
          }
        : undefined,
    },
  });

  const primary = existing.contacts[0];
  if (primary) {
    await prisma.contact.update({
      where: { id: primary.id },
      data: {
        name: primary.name || row.contactName || undefined,
        role: primary.role || row.contactRole || undefined,
        phone: primary.phone || row.phone || undefined,
        whatsApp: primary.whatsApp || row.whatsApp || row.phone || undefined,
        email: primary.email || row.email || undefined,
        linkedIn: primary.linkedIn || row.linkedIn || undefined,
      },
    });
  } else if (row.contactName || row.phone || row.email) {
    await prisma.contact.create({
      data: {
        leadId: lead.id,
        name: row.contactName ?? undefined,
        role: row.contactRole ?? undefined,
        phone: row.phone ?? undefined,
        whatsApp: row.whatsApp ?? row.phone ?? undefined,
        email: row.email ?? undefined,
        linkedIn: row.linkedIn ?? undefined,
        isPrimary: true,
      },
    });
  }

  return { action: "updated", leadId: lead.id, matchReason: match.reason };
}
