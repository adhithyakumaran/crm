import { format } from "date-fns";
import type { FieldMetaMap } from "@/lib/leads/field-meta";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  businessName: "Business name",
  phone: "Phone",
  email: "Email",
  website: "Website",
  leadScore: "Lead score",
  status: "Status",
  nextFollowUpAt: "Follow-up",
};

export function FieldProvenance({ meta }: { meta: FieldMetaMap | null | undefined }) {
  if (!meta || !Object.keys(meta).length) {
    return <p className="text-sm text-muted-foreground">No field provenance recorded yet.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {Object.entries(meta).map(([field, info]) => (
        <li key={field} className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{LABELS[field] ?? field}</span>
          <Badge variant="outline">{info.source}</Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(info.updatedAt), "d MMM yyyy, HH:mm")}
          </span>
        </li>
      ))}
    </ul>
  );
}
