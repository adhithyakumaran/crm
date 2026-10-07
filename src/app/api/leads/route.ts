import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";
import { buildLeadWhere, type LeadListFilters } from "@/lib/leads/queries";
import type { LeadStatus } from "@prisma/client";
import { upsertLeadFromImport } from "@/lib/leads/upsert";

function parseFilters(searchParams: URLSearchParams): LeadListFilters {
  const statuses = searchParams.getAll("status") as LeadStatus[];
  return {
    q: searchParams.get("q") ?? undefined,
    status: statuses.length ? statuses : undefined,
    minScore: searchParams.get("minScore")
      ? Number(searchParams.get("minScore"))
      : searchParams.get("highOpportunity") === "1"
        ? 75
        : undefined,
    maxScore: searchParams.get("maxScore")
      ? Number(searchParams.get("maxScore"))
      : undefined,
    industry: searchParams.get("industry") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    websiteStatus: searchParams.get("websiteStatus") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    followUp: (searchParams.get("followUp") as LeadListFilters["followUp"]) ?? undefined,
    hot: searchParams.get("hot") === "1",
    highOpportunity: searchParams.get("highOpportunity") === "1",
    hasEmail: searchParams.get("hasEmail") === "1",
    hasPhone: searchParams.get("hasPhone") === "1",
    hasWebsite: searchParams.get("hasWebsite") === "1",
    hasWhatsApp: searchParams.get("hasWhatsApp") === "1",
    tag: searchParams.get("tag") ?? undefined,
    archived: searchParams.get("archived") === "1",
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const filters = parseFilters(searchParams);
  const sort = searchParams.get("sort") ?? "leadScore";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const take = Math.min(Number(searchParams.get("limit") ?? 100), 500);

  const leads = await prisma.lead.findMany({
    where: buildLeadWhere(auth.userId, filters),
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      sources: { orderBy: { createdAt: "desc" }, take: 1 },
      tagRelations: { include: { tag: true } },
    },
    orderBy: { [sort]: order },
    take,
  });

  return NextResponse.json({ leads });
}

const createSchema = z.object({
  businessName: z.string().min(2),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await upsertLeadFromImport(
    auth.userId,
    {
      businessName: parsed.data.businessName,
      city: parsed.data.city,
      phone: parsed.data.phone,
      email: parsed.data.email,
      sourceType: "MANUAL",
    },
    "MANUAL"
  );

  const lead = await prisma.lead.findUnique({ where: { id: result.leadId } });
  return NextResponse.json({ lead, ...result }, { status: 201 });
}
