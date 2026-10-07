import { prisma } from "@/lib/db";
import {
  extractDomain,
  normalizeBusinessName,
  normalizeEmail,
  normalizePhone,
  similarityScore,
} from "@/lib/leads/normalize";

export type LeadMatchInput = {
  businessName: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
};

export type LeadMatchResult = {
  leadId: string;
  reason: string;
} | null;

export async function findMatchingLead(
  userId: string,
  input: LeadMatchInput
): Promise<LeadMatchResult> {
  const domain = extractDomain(input.website);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const city = input.city?.trim().toLowerCase() ?? null;

  if (domain) {
    const byDomain = await prisma.lead.findFirst({
      where: { userId, websiteDomain: domain, archived: false },
      select: { id: true },
    });
    if (byDomain) return { leadId: byDomain.id, reason: "exact_domain" };
  }

  if (phone) {
    const byPhone = await prisma.lead.findFirst({
      where: { userId, normalizedPhone: phone, archived: false },
      select: { id: true },
    });
    if (byPhone) return { leadId: byPhone.id, reason: "exact_phone" };
  }

  if (email) {
    const byEmail = await prisma.lead.findFirst({
      where: { userId, normalizedEmail: email, archived: false },
      select: { id: true },
    });
    if (byEmail) return { leadId: byEmail.id, reason: "exact_email" };
  }

  if (input.businessName && city) {
    const candidates = await prisma.lead.findMany({
      where: {
        userId,
        archived: false,
        city: { equals: input.city, mode: "insensitive" },
        businessName: { equals: input.businessName, mode: "insensitive" },
      },
      take: 1,
      select: { id: true },
    });
    if (candidates[0]) {
      return { leadId: candidates[0].id, reason: "business_name_location" };
    }
  }

  const nameNorm = normalizeBusinessName(input.businessName);
  if (nameNorm.length >= 4) {
    const fuzzy = await prisma.lead.findMany({
      where: {
        userId,
        archived: false,
        OR: [
          phone ? { normalizedPhone: phone } : undefined,
          input.address
            ? { address: { contains: input.address.slice(0, 24), mode: "insensitive" } }
            : undefined,
        ].filter(Boolean) as object[],
      },
      take: 40,
      select: {
        id: true,
        businessName: true,
        normalizedPhone: true,
        address: true,
      },
    });

    for (const row of fuzzy) {
      const sim = similarityScore(row.businessName, input.businessName);
      const phoneMatch = phone && row.normalizedPhone === phone;
      const addressMatch =
        input.address &&
        row.address &&
        row.address.toLowerCase().includes(input.address.toLowerCase().slice(0, 20));
      if (sim >= 0.85 && (phoneMatch || addressMatch)) {
        return { leadId: row.id, reason: "name_similarity_contact" };
      }
    }
  }

  return null;
}
