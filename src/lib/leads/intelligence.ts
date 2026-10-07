import type {
  BuyingIntent,
  LeadIntelCategory,
  OpportunityType,
  ProjectType,
} from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";

export type EvidenceItem = {
  label: string;
  url: string;
  type?: string;
};

export type IntentTier =
  | "IMMEDIATE"
  | "ACTIVE"
  | "RECENT"
  | "LOW"
  | "NONE";

export function intentTier(score: number): IntentTier {
  if (score >= 90) return "IMMEDIATE";
  if (score >= 70) return "ACTIVE";
  if (score >= 50) return "RECENT";
  if (score > 0) return "LOW";
  return "NONE";
}

export function intentTierLabel(tier: IntentTier): string {
  switch (tier) {
    case "IMMEDIATE":
      return "🔥 IMMEDIATE DEMAND";
    case "ACTIVE":
      return "🔥 ACTIVE DEMAND";
    case "RECENT":
      return "🟡 RECENT DEMAND";
    case "LOW":
      return "Low intent";
    default:
      return "—";
  }
}

export function intelCategoryLabel(cat: LeadIntelCategory | null | undefined): string {
  switch (cat) {
    case "ACTIVE_DEMAND":
      return "🔥 ACTIVE DEMAND";
    case "BOTH":
      return "🔥 ACTIVE + BUSINESS";
    case "BUSINESS_OPPORTUNITY":
    default:
      return "🟢 BUSINESS OPPORTUNITY";
  }
}

export function daysSincePosted(postedAt: Date | string | null | undefined): number | null {
  if (!postedAt) return null;
  const d = typeof postedAt === "string" ? new Date(postedAt) : postedAt;
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, differenceInCalendarDays(new Date(), d));
}

export function recencyIntentPoints(days: number | null): number {
  if (days == null) return 0;
  if (days === 0) return 40;
  if (days <= 3) return 35;
  if (days <= 7) return 30;
  if (days <= 14) return 20;
  if (days <= 30) return 10;
  return 0;
}

export function normalizeOpportunityType(
  raw?: string | null
): OpportunityType | undefined {
  if (!raw?.trim()) return undefined;
  const v = raw.trim().toUpperCase();
  const map: Record<string, OpportunityType> = {
    WEBSITE: "WEBSITE",
    WEBSITE_REDESIGN: "WEBSITE_REDESIGN",
    REDESIGN: "WEBSITE_REDESIGN",
    WEB_APPLICATION: "WEB_APPLICATION",
    WEB_APP: "WEB_APPLICATION",
    MOBILE_APPLICATION: "MOBILE_APPLICATION",
    MOBILE_APP: "MOBILE_APPLICATION",
    ECOMMERCE: "ECOMMERCE",
    BOOKING_SYSTEM: "BOOKING_SYSTEM",
    APPOINTMENT_SYSTEM: "APPOINTMENT_SYSTEM",
    CRM: "CRM",
    BUSINESS_DASHBOARD: "BUSINESS_DASHBOARD",
    AUTOMATION: "AUTOMATION",
    CUSTOM_SOFTWARE: "CUSTOM_SOFTWARE",
    AI_SOLUTION: "AI_SOLUTION",
    API_INTEGRATION: "API_INTEGRATION",
    OTHER: "OTHER",
  };
  return map[v] ?? (v in map ? map[v] : "OTHER");
}

export function normalizeProjectType(raw?: string | null): ProjectType {
  if (!raw?.trim()) return "UNKNOWN";
  const v = raw.trim().toUpperCase();
  const allowed: ProjectType[] = [
    "SMALL_WEBSITE",
    "BUSINESS_WEBSITE",
    "WEBSITE_REDESIGN",
    "ECOMMERCE",
    "SMALL_WEB_APP",
    "BUSINESS_WEB_APP",
    "MOBILE_APP",
    "CUSTOM_SOFTWARE",
    "AUTOMATION",
    "ENTERPRISE_LITE",
    "UNKNOWN",
  ];
  return allowed.includes(v as ProjectType) ? (v as ProjectType) : "UNKNOWN";
}

export function normalizeBuyingIntent(raw?: string | null): BuyingIntent {
  if (!raw?.trim()) return "UNKNOWN";
  const v = raw.trim().toUpperCase() as BuyingIntent;
  const allowed: BuyingIntent[] = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW", "UNKNOWN"];
  return allowed.includes(v) ? v : "UNKNOWN";
}

export function parseEvidence(raw: unknown): EvidenceItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return { label: "Source", url: item };
        if (item && typeof item === "object" && "url" in item) {
          const o = item as { url: string; label?: string; type?: string };
          return { label: o.label ?? "Source", url: o.url, type: o.type };
        }
        return null;
      })
      .filter(Boolean) as EvidenceItem[];
  }
  return [];
}

export function computeIntentScore(input: {
  postedAt?: Date | string | null;
  requirementText?: string | null;
  hasContact?: boolean;
  hasDecisionMaker?: boolean;
}): number {
  let score = 0;
  const days = daysSincePosted(input.postedAt);
  score += recencyIntentPoints(days);

  const text = (input.requirementText ?? "").toLowerCase();
  if (
    /looking for (a )?(web|software|app|mobile|freelance|developer|agency|company)/i.test(
      text
    ) ||
    /need (a )?(website|web app|software|app|developer|crm|erp|automation|dashboard|portal)/i.test(
      text
    ) ||
    /quotation|quote required|rfp/i.test(text)
  ) {
    score += 30;
  }
  if (/quotation|recommend|suggest a developer|who can build/i.test(text)) {
    score += 25;
  }
  if (/new (business|branch|project|startup|launch)/i.test(text)) {
    score += 20;
  }
  if (input.hasContact) score += 10;
  if (input.hasDecisionMaker) score += 10;
  return Math.min(100, score);
}

export function enrichBusinessOpportunityLead(input: {
  businessName: string;
  industry?: string;
  website?: string | null;
  websiteStatus?: string | null;
  detectedProblem?: string | null;
  city?: string | null;
}): {
  solutionNeeded: string;
  businessOpportunity: string;
  whyThisLead: string;
  projectType: ProjectType;
  buyingIntent: BuyingIntent;
} {
  const industry = (input.industry ?? "").toLowerCase();
  const noSite = !input.website?.trim();
  const outdated =
    input.websiteStatus === "outdated" ||
    input.websiteStatus === "directory_only" ||
    (input.website?.startsWith("http://") ?? false);

  let solutionNeeded =
    "Modern business website with clear service pages, enquiry form, and WhatsApp handoff.";
  let businessOpportunity = "Business website + enquiry funnel";
  let projectType: ProjectType = "BUSINESS_WEBSITE";

  if (industry.includes("dental") || industry.includes("clinic")) {
    solutionNeeded =
      "Appointment booking flow with service pages, reminders, and admin dashboard.";
    businessOpportunity = "Appointment booking web app";
    projectType = "BUSINESS_WEB_APP";
  } else if (industry.includes("pg") || industry.includes("hostel")) {
    solutionNeeded =
      "PG listing site with room availability, enquiry CRM, and tenant onboarding.";
    businessOpportunity = "Custom PG management web application";
    projectType = "BUSINESS_WEB_APP";
  } else if (industry.includes("real estate") || industry.includes("property")) {
    solutionNeeded =
      "Property listing site with filters, map, and lead capture integrated to CRM.";
    businessOpportunity = "Real-estate listings + lead CRM";
    projectType = "BUSINESS_WEBSITE";
  } else if (industry.includes("restaurant") || industry.includes("food")) {
    solutionNeeded =
      "Menu-led website with online ordering or enquiry, plus Google/WhatsApp CTAs.";
    businessOpportunity = "Restaurant ordering / enquiry website";
    projectType = "ECOMMERCE";
  } else if (industry.includes("interior")) {
    solutionNeeded =
      "Portfolio website with project galleries, testimonials, and structured enquiry funnel.";
    businessOpportunity = "Website redesign + project enquiry system";
    projectType = "WEBSITE_REDESIGN";
  } else if (noSite) {
    solutionNeeded =
      "New business website with service pages, portfolio, enquiry form and WhatsApp integration.";
    businessOpportunity = "New business website";
    projectType = "SMALL_WEBSITE";
  } else if (outdated) {
    solutionNeeded =
      "Website redesign with mobile-first UX, faster load, and clear CTAs.";
    businessOpportunity = "Website redesign + lead capture";
    projectType = "WEBSITE_REDESIGN";
  }

  const problem =
    input.detectedProblem ??
    (noSite
      ? "No owned website found — discovery likely via directories or social only."
      : outdated
        ? "Web presence appears dated or thin on conversion paths."
        : "Visible gap in digital lead capture or self-service.");

  const whyThisLead = `${input.businessName}${
    input.city ? ` (${input.city})` : ""
  } shows a concrete digital gap: ${problem} A focused build could turn existing demand into booked enquiries without extra ad spend.`;

  const buyingIntent: BuyingIntent =
    noSite || outdated ? "MEDIUM" : "LOW";

  return {
    solutionNeeded,
    businessOpportunity,
    whyThisLead,
    projectType,
    buyingIntent,
  };
}
