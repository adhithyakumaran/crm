/**
 * Export CRM leads as XLSX with column headers matching IMPORTABLE_FIELDS (direct import).
 * Run: npx tsx scripts/export-import-xlsx.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/db";
import { ensureDefaultUser } from "../src/lib/auth/default-user";
import { IMPORTABLE_FIELDS } from "../src/lib/constants";

async function main() {
  const userId = await ensureDefaultUser();
  const leads = await prisma.lead.findMany({
    where: { userId },
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      sources: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ leadScore: "desc" }, { businessName: "asc" }],
  });

  const rows = leads.map((lead) => {
    const contact = lead.contacts[0];
    const source = lead.sources[0];
    const row: Record<string, string | number> = {};
    for (const field of IMPORTABLE_FIELDS) {
      switch (field) {
        case "contactName":
          row[field] = contact?.name ?? "";
          break;
        case "contactRole":
          row[field] = contact?.role ?? "";
          break;
        case "phone":
          row[field] = contact?.phone ?? "";
          break;
        case "whatsApp":
          row[field] = contact?.whatsApp ?? contact?.phone ?? "";
          break;
        case "email":
          row[field] = contact?.email ?? "";
          break;
        case "linkedIn":
          row[field] = contact?.linkedIn ?? "";
          break;
        case "sourceType":
          row[field] = source?.type ?? "CSV_IMPORT";
          break;
        case "sourceUrl":
          row[field] = source?.sourceUrl ?? "";
          break;
        case "nextFollowUpAt":
          row[field] = lead.nextFollowUpAt?.toISOString() ?? "";
          break;
        case "status":
          row[field] = lead.status;
          break;
        case "leadScore":
          row[field] = lead.leadScore ?? "";
          break;
        default:
          row[field] =
            (lead as Record<string, unknown>)[field]?.toString() ?? "";
      }
    }
    return row;
  });

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [...IMPORTABLE_FIELDS],
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Chennai Leads");

  const outDir = path.join(process.cwd(), "exports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "chennai-qualified-leads.xlsx");
  XLSX.writeFile(book, outPath);

  console.log(
    JSON.stringify({ exported: rows.length, path: outPath }, null, 2)
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
