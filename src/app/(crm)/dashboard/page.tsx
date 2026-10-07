"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus } from "@prisma/client";

type DashboardData = {
  kpis: Record<string, number>;
  followUps: { today: number; overdue: number; upcoming: number };
  pipeline: { status: LeadStatus; count: number }[];
};

const quickFilters = [
  { label: "Hot leads", href: "/leads?hot=1" },
  { label: "New leads", href: "/leads?status=NEW" },
  { label: "Follow-ups today", href: "/leads?followUp=today" },
  { label: "Overdue", href: "/leads?followUp=overdue" },
  { label: "No contact yet", href: "/leads?status=NEW&status=REVIEWED" },
  { label: "High score (75+)", href: "/leads?minScore=75" },
  { label: "Chennai", href: "/leads?city=Chennai" },
  { label: "Tamil Nadu", href: "/leads?state=Tamil Nadu" },
  { label: "Website opportunity", href: "/leads?tag=WEBSITE" },
  { label: "App opportunity", href: "/leads?tag=WEB_APP" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  const kpiCards = [
    ["Total leads", data.kpis.total],
    ["New", data.kpis.new],
    ["To contact", data.kpis.toContact],
    ["Contacted", data.kpis.contacted],
    ["Responded", data.kpis.responded],
    ["Follow-ups due", data.kpis.followUpsDue],
    ["Meetings", data.kpis.meetings],
    ["Proposals", data.kpis.proposals],
    ["Won", data.kpis.won],
    ["Lost", data.kpis.lost],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <Button asChild>
          <Link href="/import">Import leads</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pipeline.map((step) => (
              <div key={step.status} className="flex items-center gap-3">
                <div className="w-28 text-xs font-medium">{STATUS_LABELS[step.status]}</div>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, (step.count / Math.max(data.kpis.total, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm tabular-nums">{step.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Link className="flex justify-between hover:underline" href="/leads?followUp=today">
              <span>Due today</span>
              <strong>{data.followUps.today}</strong>
            </Link>
            <Link className="flex justify-between hover:underline" href="/leads?followUp=overdue">
              <span>Overdue</span>
              <strong className="text-destructive">{data.followUps.overdue}</strong>
            </Link>
            <Link className="flex justify-between hover:underline" href="/leads?followUp=upcoming">
              <span>Upcoming</span>
              <strong>{data.followUps.upcoming}</strong>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickFilters.map((f) => (
            <Button key={f.href} variant="outline" size="sm" asChild>
              <Link href={f.href}>{f.label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
