export type LeadColumnId =
  | "score"
  | "business"
  | "industry"
  | "location"
  | "contact"
  | "phone"
  | "email"
  | "website"
  | "status"
  | "lastContact"
  | "followUp"
  | "source"
  | "created";

export const LEAD_COLUMNS: { id: LeadColumnId; label: string; default: boolean }[] = [
  { id: "score", label: "Score", default: true },
  { id: "business", label: "Business", default: true },
  { id: "industry", label: "Industry", default: true },
  { id: "location", label: "Location", default: true },
  { id: "contact", label: "Contact", default: true },
  { id: "phone", label: "Phone", default: true },
  { id: "email", label: "Email", default: true },
  { id: "website", label: "Website", default: false },
  { id: "status", label: "Status", default: true },
  { id: "lastContact", label: "Last contacted", default: false },
  { id: "followUp", label: "Next follow-up", default: true },
  { id: "source", label: "Source", default: true },
  { id: "created", label: "Created", default: false },
];

const STORAGE_KEY = "fieldnote-lead-columns";

export function loadVisibleColumns(): LeadColumnId[] {
  if (typeof window === "undefined") {
    return LEAD_COLUMNS.filter((c) => c.default).map((c) => c.id);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return LEAD_COLUMNS.filter((c) => c.default).map((c) => c.id);
    const parsed = JSON.parse(raw) as LeadColumnId[];
    return parsed.length ? parsed : LEAD_COLUMNS.filter((c) => c.default).map((c) => c.id);
  } catch {
    return LEAD_COLUMNS.filter((c) => c.default).map((c) => c.id);
  }
}

export function saveVisibleColumns(ids: LeadColumnId[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
