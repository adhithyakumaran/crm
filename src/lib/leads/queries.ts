import type { LeadStatus, Prisma } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

export type LeadListFilters = {
  q?: string;
  status?: LeadStatus | LeadStatus[];
  minScore?: number;
  maxScore?: number;
  industry?: string;
  city?: string;
  state?: string;
  source?: string;
  websiteStatus?: string;
  followUp?: "today" | "overdue" | "upcoming";
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasWhatsApp?: boolean;
  hasWebsite?: boolean;
  hot?: boolean;
  highOpportunity?: boolean;
  tag?: string;
  archived?: boolean;
  ids?: string[];
};

export function buildLeadWhere(
  userId: string,
  filters: LeadListFilters
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    userId,
    archived: filters.archived ?? false,
  };

  if (filters.ids?.length) {
    where.id = { in: filters.ids };
  }

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { businessName: { contains: q, mode: "insensitive" } },
      { industry: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { website: { contains: q, mode: "insensitive" } },
      { websiteDomain: { contains: q, mode: "insensitive" } },
      { normalizedPhone: { contains: q.replace(/\D/g, "") } },
      { normalizedEmail: { contains: q.toLowerCase() } },
      { contacts: { some: { name: { contains: q, mode: "insensitive" } } } },
      { notes: { some: { body: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (filters.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }

  if (filters.minScore != null || filters.maxScore != null) {
    where.leadScore = {
      ...(filters.minScore != null ? { gte: filters.minScore } : {}),
      ...(filters.maxScore != null ? { lte: filters.maxScore } : {}),
    };
  }

  if (filters.industry) {
    where.industry = { contains: filters.industry, mode: "insensitive" };
  }
  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }
  if (filters.state) {
    where.state = { contains: filters.state, mode: "insensitive" };
  }

  if (filters.hot) where.isHot = true;
  if (filters.highOpportunity) where.leadScore = { gte: 75 };

  if (filters.hasWebsite) where.website = { not: null };
  if (filters.hasEmail) where.normalizedEmail = { not: null };
  if (filters.hasPhone) where.normalizedPhone = { not: null };
  if (filters.hasWhatsApp) {
    where.contacts = { some: { whatsApp: { not: null } } };
  }

  if (filters.tag) {
    where.tagRelations = { some: { tag: { name: filters.tag } } };
  }

  const now = new Date();
  if (filters.followUp === "today") {
    where.nextFollowUpAt = { gte: startOfDay(now), lte: endOfDay(now) };
  } else if (filters.followUp === "overdue") {
    where.nextFollowUpAt = { lt: startOfDay(now) };
  } else if (filters.followUp === "upcoming") {
    where.nextFollowUpAt = { gt: endOfDay(now) };
  }

  return where;
}
