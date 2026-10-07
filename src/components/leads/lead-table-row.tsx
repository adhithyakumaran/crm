"use client";

import Link from "next/link";
import { format } from "date-fns";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadScoreBadge } from "@/components/lead-score-badge";
import { StatusBadge } from "@/components/status-badge";
import type { LeadColumnId } from "@/lib/leads/columns";
import type { BuyingIntent, LeadIntelCategory, LeadStatus } from "@prisma/client";
import { LeadIntelPreview } from "@/components/leads/lead-intel-preview";

export type LeadRowData = {
  id: string;
  businessName: string;
  industry: string | null;
  city: string | null;
  location: string | null;
  website: string | null;
  status: LeadStatus;
  leadScore: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  leadIntelCategory?: LeadIntelCategory | null;
  intentScore?: number;
  detectedProblem?: string | null;
  requirementSummary?: string | null;
  solutionNeeded?: string | null;
  businessOpportunity?: string | null;
  postedAt?: string | null;
  buyingIntent?: BuyingIntent | null;
  contacts: { name: string | null; phone: string | null; email: string | null }[];
  sources: { type: string }[];
};

type Props = {
  lead: LeadRowData;
  visible: LeadColumnId[];
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
};

export function LeadTableRow({ lead, visible, checked, onCheckedChange }: Props) {
  const contact = lead.contacts[0];

  function cell(id: LeadColumnId) {
    switch (id) {
      case "score":
        return <LeadScoreBadge score={lead.leadScore} />;
      case "business":
        return (
          <div>
            <Link href={`/leads/${lead.id}`} className="hover:underline font-medium">
              {lead.businessName}
            </Link>
            <LeadIntelPreview
              leadIntelCategory={lead.leadIntelCategory}
              intentScore={lead.intentScore}
              detectedProblem={lead.detectedProblem}
              requirementSummary={lead.requirementSummary}
              solutionNeeded={lead.solutionNeeded}
              businessOpportunity={lead.businessOpportunity}
              postedAt={lead.postedAt}
            />
          </div>
        );
      case "industry":
        return lead.industry ?? "—";
      case "location":
        return lead.city ?? lead.location ?? "—";
      case "contact":
        return contact?.name ?? "—";
      case "phone":
        return contact?.phone ?? "—";
      case "email":
        return contact?.email ?? "—";
      case "website":
        return lead.website ? (
          <a href={lead.website} target="_blank" rel="noreferrer" className="underline">
            Link
          </a>
        ) : (
          "—"
        );
      case "status":
        return <StatusBadge status={lead.status} />;
      case "lastContact":
        return lead.lastContactedAt
          ? format(new Date(lead.lastContactedAt), "d MMM yyyy")
          : "—";
      case "followUp":
        return lead.nextFollowUpAt
          ? format(new Date(lead.nextFollowUpAt), "d MMM")
          : "—";
      case "source":
        return lead.sources[0]?.type ?? "—";
      case "created":
        return format(new Date(lead.createdAt), "d MMM yyyy");
      default:
        return "—";
    }
  }

  return (
    <TableRow data-state={checked ? "selected" : undefined}>
      <TableCell>
        <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} />
      </TableCell>
      {visible.map((col) => (
        <TableCell key={col} className="max-w-[160px] truncate text-sm">
          {cell(col)}
        </TableCell>
      ))}
    </TableRow>
  );
}
