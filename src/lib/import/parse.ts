import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedSheet = {
  columns: string[];
  rows: Record<string, string>[];
};

function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) continue;
    out[k.trim()] = String(v).trim();
  }
  return out;
}

export function parseCsvText(text: string): ParsedSheet {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const rows = (result.data ?? []).map(normalizeRow).filter((r) =>
    Object.values(r).some(Boolean)
  );
  const columns = result.meta.fields?.map((c) => c.trim()) ?? [];
  return { columns, rows };
}

export function parseWorkbookBuffer(buffer: ArrayBuffer): ParsedSheet {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  const rows = json.map(normalizeRow).filter((r) => Object.values(r).some(Boolean));
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return { columns, rows };
}

export function mapRowToLead(
  row: Record<string, string>,
  columnMap: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [fileCol, field] of Object.entries(columnMap)) {
    if (!field || field === "_skip") continue;
    if (row[fileCol]) mapped[field] = row[fileCol];
  }
  return mapped;
}
