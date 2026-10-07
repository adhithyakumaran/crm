import { NextResponse } from "next/server";
import { z } from "zod";
import type { LeadSourceType, OpportunityType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireIngestKey, requireUser } from "@/lib/api/guard";
import {
  mapRowToLead,
  parseCsvText,
  parseWorkbookBuffer,
} from "@/lib/import/parse";
import { upsertLeadFromImport, type IncomingLeadRow } from "@/lib/leads/upsert";

function rowToIncoming(mapped: Record<string, string>): IncomingLeadRow | null {
  const businessName = mapped.businessName?.trim();
  if (!businessName) return null;

  return {
    businessName,
    category: mapped.category,
    industry: mapped.industry ?? mapped.category,
    description: mapped.description,
    city: mapped.city,
    state: mapped.state,
    country: mapped.country,
    address: mapped.address,
    location: mapped.location,
    googleMapsUrl: mapped.googleMapsUrl,
    website: mapped.website,
    businessSize: mapped.businessSize,
    leadScore: mapped.leadScore ? Number(mapped.leadScore) : undefined,
    scoreReason: mapped.scoreReason,
    detectedProblem: mapped.detectedProblem,
    suggestedSolution: mapped.suggestedSolution,
    solutionNeeded: mapped.solutionNeeded ?? mapped.suggestedSolution,
    suggestedService: mapped.suggestedService,
    suggestedPitch: mapped.suggestedPitch,
    opportunityType: mapped.opportunityType as OpportunityType | undefined,
    businessOpportunity: mapped.businessOpportunity,
    whyThisLead: mapped.whyThisLead,
    leadIntelCategory: mapped.leadIntelCategory as
      | import("@prisma/client").LeadIntelCategory
      | undefined,
    buyingIntent: mapped.buyingIntent as import("@prisma/client").BuyingIntent | undefined,
    intentScore: mapped.intentScore ? Number(mapped.intentScore) : undefined,
    projectType: mapped.projectType as import("@prisma/client").ProjectType | undefined,
    postedAt: mapped.postedAt || undefined,
    postUrl: mapped.postUrl,
    postPlatform: mapped.postPlatform,
    postAuthor: mapped.postAuthor,
    postAuthorRole: mapped.postAuthorRole,
    postTextSummary: mapped.postTextSummary,
    requirementSummary: mapped.requirementSummary,
    businessValue: mapped.businessValue,
    contactName: mapped.contactName,
    contactRole: mapped.contactRole,
    phone: mapped.phone,
    whatsApp: mapped.whatsApp,
    email: mapped.email,
    linkedIn: mapped.linkedIn,
    instagram: mapped.instagram,
    facebook: mapped.facebook,
    sourceType: (mapped.sourceType as LeadSourceType) ?? "CSV_IMPORT",
    sourceUrl: mapped.sourceUrl,
    websiteStatus: mapped.websiteStatus,
  };
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const auth = apiKey
    ? await requireIngestKey(request)
    : await requireUser(request);
  if (auth.error) return auth.error;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    const leads = z.array(z.record(z.string(), z.unknown())).parse(body.leads ?? body);
    const summary = { created: 0, updated: 0, invalid: 0 };

    for (const raw of leads) {
      const mapped = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, String(v ?? "")])
      );
      const incoming = rowToIncoming(mapped);
      if (!incoming) {
        summary.invalid += 1;
        continue;
      }
      const result = await upsertLeadFromImport(auth.userId, incoming, "API");
      if (result.action === "created") summary.created += 1;
      else summary.updated += 1;
    }

    return NextResponse.json({ summary });
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const mode = String(form.get("mode") ?? "preview");
    const columnMapRaw = form.get("columnMap");
    const columnMap = columnMapRaw
      ? (JSON.parse(String(columnMapRaw)) as Record<string, string>)
      : {};

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const ext = file.name.toLowerCase();
    const parsed =
      ext.endsWith(".xlsx") || ext.endsWith(".xls")
        ? parseWorkbookBuffer(buffer)
        : parseCsvText(new TextDecoder().decode(buffer));

    const importRow = await prisma.import.create({
      data: {
        userId: auth.userId,
        filename: file.name,
        format: ext.endsWith(".xlsx") ? "xlsx" : "csv",
        status: "PREVIEW",
        columnMap: columnMapRaw ? columnMap : undefined,
      },
    });

    const preview = {
      new: [] as object[],
      updated: [] as object[],
      duplicates: [] as object[],
      invalid: [] as object[],
    };

    for (let i = 0; i < parsed.rows.length; i++) {
      const mapped = columnMap && Object.keys(columnMap).length
        ? mapRowToLead(parsed.rows[i], columnMap)
        : parsed.rows[i];
      const incoming = rowToIncoming(mapped);
      if (!incoming) {
        preview.invalid.push({ rowIndex: i, row: parsed.rows[i] });
        continue;
      }

      const { findMatchingLead } = await import("@/lib/leads/match");
      const match = await findMatchingLead(auth.userId, {
        businessName: incoming.businessName,
        website: incoming.website,
        phone: incoming.phone,
        email: incoming.email,
        city: incoming.city,
        address: incoming.address,
      });

      const item = { rowIndex: i, businessName: incoming.businessName, matchReason: match?.reason };
      if (match) preview.updated.push(item);
      else preview.new.push(item);

      if (mode === "commit") {
        const result = await upsertLeadFromImport(
          auth.userId,
          incoming,
          "CSV",
          importRow.id
        );
        await prisma.importRecord.create({
          data: {
            importId: importRow.id,
            leadId: result.leadId,
            rowIndex: i,
            action: result.action,
            matchReason: result.matchReason,
            raw: mapped,
          },
        });
      }
    }

    if (mode === "commit") {
      await prisma.import.update({
        where: { id: importRow.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          summary: {
            new: preview.new.length,
            updated: preview.updated.length,
            invalid: preview.invalid.length,
          },
        },
      });
    }

    return NextResponse.json({
      importId: importRow.id,
      columns: parsed.columns,
      preview,
      totalRows: parsed.rows.length,
    });
  }

  return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
}
