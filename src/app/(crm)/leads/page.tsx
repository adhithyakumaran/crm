"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadScoreBadge } from "@/components/lead-score-badge";
import { StatusBadge } from "@/components/status-badge";
import type { LeadStatus } from "@prisma/client";

type LeadRow = {
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
  contacts: { name: string | null; phone: string | null; email: string | null }[];
  sources: { type: string }[];
};

const DEFAULT_COLUMNS = [
  "score",
  "business",
  "industry",
  "location",
  "contact",
  "phone",
  "email",
  "status",
  "followUp",
  "source",
] as const;

function LeadsPage() {
  const params = useSearchParams();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const p = new URLSearchParams(params.toString());
    if (q) p.set("q", q);
    p.set("sort", "leadScore");
    p.set("order", "desc");
    return p.toString();
  }, [params, q]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/leads?${queryString}`)
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .finally(() => setLoading(false));
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const allSelected = leads.length > 0 && selected.length === leads.length;

  function toggleAll() {
    setSelected(allSelected ? [] : leads.map((l) => l.id));
  }

  async function bulkStatus(status: LeadStatus) {
    await fetch("/api/leads/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected, action: "status", status }),
    });
    setSelected([]);
    load();
  }

  function exportSelected() {
    const qs = selected.length
      ? `format=csv&ids=${selected.join(",")}`
      : `format=csv&${queryString}`;
    window.open(`/api/exports?${qs}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Review, contact, and track freelance opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSelected}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search business, phone, email, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <Button variant="secondary" onClick={load}>Search</Button>
        {selected.length > 0 && (
          <>
            <Button size="sm" variant="outline" onClick={() => bulkStatus("CONTACTED")}>
              Mark contacted
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatus("REVIEWED")}>
              Mark reviewed
            </Button>
          </>
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              {DEFAULT_COLUMNS.map((c) => (
                <TableHead key={c} className="capitalize">{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-muted-foreground">
                  Loading leads…
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-muted-foreground">
                  No leads match your filters.{" "}
                  <Link href="/import" className="underline">Import a CSV</Link>.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const contact = lead.contacts[0];
                const checked = selected.includes(lead.id);
                return (
                  <TableRow key={lead.id} data-state={checked ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setSelected((s) =>
                            v ? [...s, lead.id] : s.filter((id) => id !== lead.id)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <LeadScoreBadge score={lead.leadScore} />
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium">
                      <Link href={`/leads/${lead.id}`} className="hover:underline">
                        {lead.businessName}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-muted-foreground">
                      {lead.industry ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {lead.city ?? lead.location ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate">
                      {contact?.name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[110px] truncate text-xs">
                      {contact?.phone ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs">
                      {contact?.email ?? "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.nextFollowUpAt
                        ? format(new Date(lead.nextFollowUpAt), "d MMM")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.sources[0]?.type ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function LeadsPageWithSuspense() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading leads…</p>}>
      <LeadsPage />
    </Suspense>
  );
}
