"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus } from "@prisma/client";

type DashboardData = {
  kpis: Record<string, number>;
  followUps: { today: number; overdue: number; upcoming: number };
  pipeline: { status: LeadStatus; count: number }[];
  intelligence?: {
    activeDemand: number;
    businessOpportunity: number;
    postedLast7: number;
    hottestDemand: Array<{
      id: string;
      businessName: string;
      intentScore: number;
      leadScore: number;
      requirementSummary: string | null;
      postedAt: string | null;
      phone: string | null;
    }>;
  };
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
  { label: "Active demand", href: "/leads?leadIntelCategory=ACTIVE_DEMAND" },
  { label: "Posted last 7 days", href: "/leads?postedWithinDays=7" },
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

  const intel = data.intelligence;

  const kpiCards = [
    ["Total leads", data.kpis.total],
    ["🔥 Active demand", intel?.activeDemand ?? 0],
    ["🔥 Posted last 7 days", intel?.postedLast7 ?? 0],
    ["🟢 Business opportunities", intel?.businessOpportunity ?? 0],
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

  const chartData = data.pipeline.map((step) => ({
    name: STATUS_LABELS[step.status],
    count: step.count,
  }));

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
            <CardTitle>Pipeline volume</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

      {intel?.hottestDemand?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Hottest new demand</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {intel.hottestDemand.map((h) => (
              <div key={h.id} className="border-b pb-2 last:border-0">
                <Link href={`/leads/${h.id}`} className="font-medium hover:underline">
                  {h.businessName}
                </Link>
                <p className="text-muted-foreground line-clamp-2">
                  {h.requirementSummary ?? "Explicit development requirement"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Intent {h.intentScore} · Score {h.leadScore}
                  {h.phone ? ` · ${h.phone}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
