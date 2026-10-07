"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PIPELINE_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadScoreBadge } from "@/components/lead-score-badge";
import type { LeadStatus } from "@prisma/client";
import { toast } from "sonner";

type LeadCard = {
  id: string;
  businessName: string;
  leadScore: number;
  status: LeadStatus;
  city: string | null;
};

export default function KanbanPage() {
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/leads?limit=500")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveLead(leadId: string, status: LeadStatus) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status } : l))
    );
    toast.success(`Moved to ${STATUS_LABELS[status]}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline board</h1>
        <p className="text-sm text-muted-foreground">Drag cards between columns to update status</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_STATUSES.map((status) => {
          const column = leads.filter((l) => l.status === status);
          return (
            <div
              key={status}
              className="min-w-[240px] shrink-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) moveLead(dragId, status);
                setDragId(null);
              }}
            >
              <Card className="bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {STATUS_LABELS[status]} ({column.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 min-h-[120px]">
                  {column.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => setDragId(null)}
                      className="cursor-grab rounded-lg border bg-background p-2 text-sm shadow-sm active:cursor-grabbing"
                    >
                      <Link href={`/leads/${lead.id}`} className="block">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium leading-tight">{lead.businessName}</span>
                          <LeadScoreBadge score={lead.leadScore} />
                        </div>
                        <p className="text-xs text-muted-foreground">{lead.city}</p>
                      </Link>
                    </div>
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
