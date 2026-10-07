/**
 * Import export XLSX into CRM via existing upsert (same as Import UI commit).
 * Run: npx tsx scripts/import-xlsx-to-crm.ts [path-to-xlsx]
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { ensureDefaultUser } from "../src/lib/auth/default-user";
import { parseWorkbookBuffer } from "../src/lib/import/parse";
import { upsertLeadFromImport, type IncomingLeadRow } from "../src/lib/leads/upsert";
import type { LeadSourceType, OpportunityType } from "@prisma/client";
import { prisma } from "../src/lib/db";

function rowToIncoming(row: Record<string, string>): IncomingLeadRow | null {
  const businessName = row.businessName?.trim();
  if (!businessName) return null;
  return {
    businessName,
    category: row.category || undefined,
    industry: row.industry || row.category || undefined,
    description: row.description || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    country: row.country || undefined,
    address: row.address || undefined,
    location: row.location || undefined,
    googleMapsUrl: row.googleMapsUrl || undefined,
    website: row.website || undefined,
    businessSize: row.businessSize || undefined,
    leadScore: row.leadScore ? Number(row.leadScore) : undefined,
    scoreReason: row.scoreReason || undefined,
    detectedProblem: row.detectedProblem || undefined,
    suggestedSolution: row.suggestedSolution || undefined,
    suggestedService: row.suggestedService || undefined,
    suggestedPitch: row.suggestedPitch || undefined,
    opportunityType: (row.opportunityType as OpportunityType) || undefined,
    businessValue: row.businessValue || undefined,
    contactName: row.contactName || undefined,
    contactRole: row.contactRole || undefined,
    phone: row.phone || undefined,
    whatsApp: row.whatsApp || undefined,
    email: row.email || undefined,
    linkedIn: row.linkedIn || undefined,
    instagram: row.instagram || undefined,
    facebook: row.facebook || undefined,
    sourceType: (row.sourceType as LeadSourceType) || "CSV_IMPORT",
    sourceUrl: row.sourceUrl || undefined,
    websiteStatus: row.websiteStatus || undefined,
  };
}

async function main() {
  const filePath =
    process.argv[2] ??
    path.join(process.cwd(), "exports/chennai-qualified-leads.xlsx");
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  const parsed = parseWorkbookBuffer(buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ));

  const userId = await ensureDefaultUser();
  const summary = { created: 0, updated: 0, invalid: 0 };

  for (const row of parsed.rows) {
    const incoming = rowToIncoming(row);
    if (!incoming) {
      summary.invalid += 1;
      continue;
    }
    const result = await upsertLeadFromImport(userId, incoming, "CSV");
    if (result.action === "created") summary.created += 1;
    else summary.updated += 1;
  }

  console.log(JSON.stringify({ filePath, ...summary }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
