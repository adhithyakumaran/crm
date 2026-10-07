"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PIPELINE_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadScoreBadge } from "@/components/lead-score-badge";
import type { LeadStatus } from "@prisma/client";

type LeadCard = {
  id: string;
  businessName: string;
  leadScore: number;
  status: LeadStatus;
  city: string | null;
};

export default function KanbanPage() {
  const [leads, setLeads] = useState<LeadCard[]>([]);

  useEffect(() => {
    fetch("/api/leads?limit=500")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pipeline board</h1>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_STATUSES.map((status) => {
          const column = leads.filter((l) => l.status === status);
          return (
            <div key={status} className="min-w-[240px] shrink-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {STATUS_LABELS[status]} ({column.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {column.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="block rounded-lg border bg-background p-2 text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium leading-tight">{lead.businessName}</span>
                        <LeadScoreBadge score={lead.leadScore} />
                      </div>
                      <p className="text-xs text-muted-foreground">{lead.city}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
