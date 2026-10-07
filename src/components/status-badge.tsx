import { STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
}
