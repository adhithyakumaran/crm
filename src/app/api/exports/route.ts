import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";
import { buildLeadWhere } from "@/lib/leads/queries";
import type { LeadStatus } from "@prisma/client";

function flattenLead(lead: Awaited<ReturnType<typeof fetchLeads>>[number]) {
  const contact = lead.contacts[0];
  const source = lead.sources[0];
  return {
    id: lead.id,
    businessName: lead.businessName,
    industry: lead.industry,
    city: lead.city,
    state: lead.state,
    status: lead.status,
    leadScore: lead.leadScore,
    scoreReason: lead.scoreReason,
    phone: contact?.phone,
    email: contact?.email,
    website: lead.website,
    detectedProblem: lead.detectedProblem,
    suggestedService: lead.suggestedService,
    suggestedPitch: lead.suggestedPitch,
    lastContactedAt: lead.lastContactedAt?.toISOString(),
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString(),
    source: source?.type,
    createdAt: lead.createdAt.toISOString(),
  };
}

async function fetchLeads(userId: string, request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean);
  const filters = {
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") as LeadStatus | undefined,
    hot: searchParams.get("hot") === "1",
    ids,
  };

  return prisma.lead.findMany({
    where: buildLeadWhere(userId, filters),
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      sources: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 5000,
  });
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  const leads = await fetchLeads(auth.userId, request);
  const rows = leads.map(flattenLead);

  if (format === "xlsx") {
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Leads");
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="leads-export.xlsx"',
      },
    });
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads-export.csv"',
    },
  });
}
