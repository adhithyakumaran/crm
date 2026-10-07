import type { FieldSource } from "@prisma/client";

export type FieldMetaMap = Record<
  string,
  { source: FieldSource; updatedAt: string }
>;

export function parseFieldMeta(raw: unknown): FieldMetaMap {
  if (!raw || typeof raw !== "object") return {};
  return raw as FieldMetaMap;
}

export function canOverwriteField(
  meta: FieldMetaMap,
  field: string,
  incoming: FieldSource
): boolean {
  const existing = meta[field];
  if (!existing) return true;
  const rank: Record<FieldSource, number> = {
    SCRAPER: 1,
    CSV: 2,
    API: 2,
    MANUAL: 3,
    USER: 4,
  };
  return rank[incoming] >= rank[existing.source];
}

export function withFieldMeta(
  meta: FieldMetaMap,
  updates: Record<string, FieldSource>
): FieldMetaMap {
  const next = { ...meta };
  const now = new Date().toISOString();
  for (const [field, source] of Object.entries(updates)) {
    next[field] = { source, updatedAt: now };
  }
  return next;
}

/** CRM operational fields — never overwritten by scraper/CSV imports */
export const PROTECTED_CRM_FIELDS = new Set([
  "status",
  "nextFollowUpAt",
  "followUpNote",
  "followUpCount",
  "lastContactedAt",
  "lastContactMethod",
  "archived",
]);
