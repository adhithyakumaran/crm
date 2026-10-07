"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, PIPELINE_STATUSES } from "@/lib/constants";
import type { LeadStatus } from "@prisma/client";
import { useState } from "react";

const SOURCES = [
  "GOOGLE_MAPS",
  "LINKEDIN",
  "INSTAGRAM",
  "WEBSITE",
  "DIRECTORY",
  "MANUAL",
  "CSV_IMPORT",
  "API",
  "OTHER",
] as const;

export function FilterPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const [status, setStatus] = useState(params.get("status") ?? "");
  const [minScore, setMinScore] = useState(params.get("minScore") ?? "");
  const [maxScore, setMaxScore] = useState(params.get("maxScore") ?? "");
  const [industry, setIndustry] = useState(params.get("industry") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  const [state, setState] = useState(params.get("state") ?? "");
  const [source, setSource] = useState(params.get("source") ?? "");
  const [tag, setTag] = useState(params.get("tag") ?? "");
  const [followUp, setFollowUp] = useState(params.get("followUp") ?? "");
  const [hasEmail, setHasEmail] = useState(params.get("hasEmail") === "1");
  const [hasPhone, setHasPhone] = useState(params.get("hasPhone") === "1");
  const [hasWhatsApp, setHasWhatsApp] = useState(params.get("hasWhatsApp") === "1");
  const [hasWebsite, setHasWebsite] = useState(params.get("hasWebsite") === "1");
  const [hot, setHot] = useState(params.get("hot") === "1");
  const [leadIntelCategory, setLeadIntelCategory] = useState(
    params.get("leadIntelCategory") ?? ""
  );
  const [intentTier, setIntentTier] = useState(params.get("intentTier") ?? "");
  const [postedWithinDays, setPostedWithinDays] = useState(
    params.get("postedWithinDays") ?? ""
  );
  const [opportunityType, setOpportunityType] = useState(
    params.get("opportunityType") ?? ""
  );

  function apply() {
    const p = new URLSearchParams(params.toString());
    const setOrDel = (key: string, val: string) => {
      if (val) p.set(key, val);
      else p.delete(key);
    };
    setOrDel("status", status);
    setOrDel("minScore", minScore);
    setOrDel("maxScore", maxScore);
    setOrDel("industry", industry);
    setOrDel("city", city);
    setOrDel("state", state);
    setOrDel("source", source);
    setOrDel("tag", tag);
    setOrDel("followUp", followUp);
    if (hot) p.set("hot", "1");
    else p.delete("hot");
    if (hasEmail) p.set("hasEmail", "1");
    else p.delete("hasEmail");
    if (hasPhone) p.set("hasPhone", "1");
    else p.delete("hasPhone");
    if (hasWhatsApp) p.set("hasWhatsApp", "1");
    else p.delete("hasWhatsApp");
    if (hasWebsite) p.set("hasWebsite", "1");
    else p.delete("hasWebsite");
    setOrDel("leadIntelCategory", leadIntelCategory);
    setOrDel("intentTier", intentTier);
    setOrDel("postedWithinDays", postedWithinDays);
    setOrDel("opportunityType", opportunityType);
    router.push(`/leads?${p.toString()}`);
    setOpen(false);
  }

  function clearAll() {
    router.push("/leads");
    setOpen(false);
  }

  const activeCount = [
    status,
    minScore,
    maxScore,
    industry,
    city,
    state,
    source,
    tag,
    followUp,
    hot,
    hasEmail,
    hasPhone,
    hasWhatsApp,
    hasWebsite,
    leadIntelCategory,
    intentTier,
    postedWithinDays,
    opportunityType,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="size-4" />
          Filters{activeCount ? ` (${activeCount})` : ""}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter leads</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 px-1">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status || "_any"} onValueChange={(v) => setStatus(v === "_any" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                {[...PIPELINE_STATUSES, "FOLLOW_UP", "NOT_INTERESTED"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s as LeadStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Min score</Label>
              <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Max score</Label>
              <Input value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Industry</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={source || "_any"} onValueChange={(v) => setSource(v === "_any" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Lead type</Label>
            <Select
              value={leadIntelCategory || "_any"}
              onValueChange={(v) => setLeadIntelCategory(v === "_any" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                <SelectItem value="ACTIVE_DEMAND">Active demand</SelectItem>
                <SelectItem value="BUSINESS_OPPORTUNITY">Business opportunity</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Intent tier</Label>
            <Select value={intentTier || "_any"} onValueChange={(v) => setIntentTier(v === "_any" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                <SelectItem value="immediate">Immediate demand (90+)</SelectItem>
                <SelectItem value="active">Active demand (70–89)</SelectItem>
                <SelectItem value="recent">Recent demand (50–69)</SelectItem>
                <SelectItem value="low">Low intent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Posted within (days)</Label>
            <Select
              value={postedWithinDays || "_any"}
              onValueChange={(v) => setPostedWithinDays(v === "_any" ? "" : v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="3">Last 3 days</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Opportunity type</Label>
            <Select
              value={opportunityType || "_any"}
              onValueChange={(v) => setOpportunityType(v === "_any" ? "" : v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                <SelectItem value="WEBSITE">Website</SelectItem>
                <SelectItem value="WEB_APPLICATION">Web app</SelectItem>
                <SelectItem value="MOBILE_APPLICATION">Mobile app</SelectItem>
                <SelectItem value="ECOMMERCE">E-commerce</SelectItem>
                <SelectItem value="AUTOMATION">Automation</SelectItem>
                <SelectItem value="CUSTOM_SOFTWARE">Custom software</SelectItem>
                <SelectItem value="AI_SOLUTION">AI solution</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tag</Label>
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. HOT" />
          </div>
          <div className="space-y-1">
            <Label>Follow-up</Label>
            <Select value={followUp || "_any"} onValueChange={(v) => setFollowUp(v === "_any" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={hot} onCheckedChange={(v) => setHot(!!v)} /> Hot leads
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={hasEmail} onCheckedChange={(v) => setHasEmail(!!v)} /> Has email
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={hasPhone} onCheckedChange={(v) => setHasPhone(!!v)} /> Has phone
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={hasWhatsApp} onCheckedChange={(v) => setHasWhatsApp(!!v)} /> Has WhatsApp
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={hasWebsite} onCheckedChange={(v) => setHasWebsite(!!v)} /> Has website
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={apply}>Apply</Button>
            <Button variant="outline" onClick={clearAll}>Clear</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
