"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadScoreBadge } from "@/components/lead-score-badge";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS, PIPELINE_STATUSES } from "@/lib/constants";
import { whatsAppUrl } from "@/lib/leads/normalize";
import type { ContactChannel, LeadStatus } from "@prisma/client";
import { FieldProvenance } from "@/components/leads/field-provenance";
import { parseFieldMeta, type FieldMetaMap } from "@/lib/leads/field-meta";
import { toast } from "sonner";
import {
  daysSincePosted,
  intelCategoryLabel,
  intentTier,
  intentTierLabel,
} from "@/lib/leads/intelligence";
import type { BuyingIntent, LeadIntelCategory, ProjectType } from "@prisma/client";

type EvidenceItem = { url: string; label?: string };

type LeadDetail = {
  id: string;
  businessName: string;
  industry: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  website: string | null;
  status: LeadStatus;
  leadScore: number;
  scoreReason: string | null;
  detectedProblem: string | null;
  solutionNeeded: string | null;
  suggestedSolution: string | null;
  suggestedService: string | null;
  suggestedPitch: string | null;
  businessOpportunity: string | null;
  whyThisLead: string | null;
  opportunityType: string | null;
  leadIntelCategory: LeadIntelCategory | null;
  buyingIntent: BuyingIntent | null;
  intentScore: number;
  projectType: ProjectType | null;
  postedAt: string | null;
  postUrl: string | null;
  postPlatform: string | null;
  postAuthor: string | null;
  postAuthorRole: string | null;
  postTextSummary: string | null;
  requirementSummary: string | null;
  nextFollowUpAt: string | null;
  followUpNote: string | null;
  digitalPresence: Record<string, string> | null;
  social: Record<string, string> | null;
  evidence: EvidenceItem[] | null;
  fieldMeta: FieldMetaMap | null;
  contacts: {
    name: string | null;
    role: string | null;
    phone: string | null;
    whatsApp: string | null;
    email: string | null;
    linkedIn: string | null;
  }[];
  activities: { id: string; title: string; description: string | null; createdAt: string }[];
  notes: { id: string; body: string; createdAt: string }[];
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [contactDialog, setContactDialog] = useState<{
    channel: ContactChannel;
    label: string;
  } | null>(null);
  const [contactNotes, setContactNotes] = useState("");
  const [markContacted, setMarkContacted] = useState(true);
  const [scoreInput, setScoreInput] = useState("");
  const [scoreReasonInput, setScoreReasonInput] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");

  const load = () => {
    if (!id) return;
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setLead(d.lead);
        if (d.lead) {
          setScoreInput(String(d.lead.leadScore ?? 0));
          setScoreReasonInput(d.lead.scoreReason ?? "");
        }
      });
  };

  useEffect(load, [id]);

  async function saveScore() {
    const leadScore = Number(scoreInput);
    if (Number.isNaN(leadScore) || leadScore < 0 || leadScore > 100) {
      toast.error("Score must be between 0 and 100");
      return;
    }
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadScore, scoreReason: scoreReasonInput }),
    });
    load();
    toast.success("Lead score updated");
  }

  async function addEvidence() {
    if (!evidenceUrl.trim()) return;
    const list = [...(lead?.evidence ?? [])];
    list.push({ url: evidenceUrl.trim(), label: evidenceLabel.trim() || undefined });
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidence: list }),
    });
    setEvidenceUrl("");
    setEvidenceLabel("");
    load();
    toast.success("Evidence added");
  }

  async function saveStatus(status: LeadStatus) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function addNote() {
    if (!note.trim()) return;
    await fetch(`/api/leads/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    });
    setNote("");
    load();
    toast.success("Note added");
  }

  async function scheduleFollowUp() {
    if (!followUpDate) return;
    await fetch(`/api/leads/${id}/follow-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dueAt: new Date(followUpDate).toISOString(),
        note: lead?.followUpNote,
      }),
    });
    load();
    toast.success("Follow-up scheduled");
  }

  async function confirmContact() {
    if (!contactDialog) return;
    await fetch(`/api/leads/${id}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: contactDialog.channel,
        notes: contactNotes,
        markContacted,
      }),
    });
    setContactDialog(null);
    setContactNotes("");
    load();
    toast.success(markContacted ? "Contact recorded" : "Activity logged");
  }

  if (!lead) {
    return <p className="text-sm text-muted-foreground">Loading lead…</p>;
  }

  const contact = lead.contacts[0];
  const wa = whatsAppUrl(contact?.whatsApp ?? contact?.phone);

  function openExternal(url: string, channel: ContactChannel, label: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    setContactDialog({ channel, label });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/leads"><ArrowLeft className="size-4" /> Back</Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold">{lead.businessName}</h1>
          <p className="text-sm text-muted-foreground">
            {[lead.city, lead.state].filter(Boolean).join(", ") || "Location unknown"}
          </p>
        </div>
        <div className="text-right text-sm">
          <LeadScoreBadge score={lead.leadScore} />
          {lead.intentScore > 0 && (
            <p className="mt-1 text-muted-foreground">
              Intent {lead.intentScore} · {intentTierLabel(intentTier(lead.intentScore))}
            </p>
          )}
        </div>
        <StatusBadge status={lead.status} />
      </div>

      {lead.whyThisLead && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Why contact this lead?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{lead.whyThisLead}</CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {contact?.phone && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openExternal(`tel:${contact.phone}`, "PHONE", "Phone")}
          >
            <Phone className="size-4" /> Call
          </Button>
        )}
        {wa && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openExternal(wa, "WHATSAPP", "WhatsApp")}
          >
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
        )}
        {contact?.email && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openExternal(`mailto:${contact.email}`, "EMAIL", "Email")
            }
          >
            <Mail className="size-4" /> Email
          </Button>
        )}
        {lead.website && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openExternal(lead.website!, "WEBSITE", "Website")}
          >
            <Globe className="size-4" /> Website
          </Button>
        )}
        {(lead.googleMapsUrl || lead.address) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openExternal(
                lead.googleMapsUrl ??
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    lead.address ?? lead.businessName
                  )}`,
                "GOOGLE_MAPS",
                "Maps"
              )
            }
          >
            <MapPin className="size-4" /> Maps
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Business</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Industry:</span> {lead.industry ?? "—"}</p>
            <p>{lead.description ?? "No description yet."}</p>
            <p className="text-muted-foreground">{lead.address}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Buying intent</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{intelCategoryLabel(lead.leadIntelCategory)}</p>
            <p>
              <span className="text-muted-foreground">Intent score:</span> {lead.intentScore}
            </p>
            <p>
              <span className="text-muted-foreground">Buying intent:</span>{" "}
              {lead.buyingIntent ?? "UNKNOWN"}
            </p>
            {lead.postedAt && (
              <p>
                <span className="text-muted-foreground">Posted:</span>{" "}
                {format(new Date(lead.postedAt), "d MMM yyyy")}
                {daysSincePosted(lead.postedAt) != null &&
                  ` (${daysSincePosted(lead.postedAt)} days ago)`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Opportunity</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">What they need</p>
              <p className="text-muted-foreground">
                {lead.solutionNeeded ?? lead.suggestedSolution ?? "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Detected problem</p>
              <p className="text-muted-foreground">{lead.detectedProblem ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium">Business opportunity</p>
              <p className="text-muted-foreground">
                {lead.businessOpportunity ?? lead.suggestedService ?? "—"}
              </p>
            </div>
            <div>
              <p className="font-medium">Opportunity type</p>
              <p className="text-muted-foreground">{lead.opportunityType ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium">Project type</p>
              <p className="text-muted-foreground">{lead.projectType ?? "UNKNOWN"}</p>
            </div>
            <div>
              <p className="font-medium">Suggested pitch</p>
              <p className="text-muted-foreground">{lead.suggestedPitch ?? "—"}</p>
            </div>
            <div className="space-y-2 border-t pt-3">
              <Label>Lead score (editable)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  className="w-24"
                />
                <Button size="sm" variant="secondary" onClick={saveScore}>Save</Button>
              </div>
              <Textarea
                placeholder="Reason for score"
                value={scoreReasonInput}
                onChange={(e) => setScoreReasonInput(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status & follow-up</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={lead.status} onValueChange={(v) => saveStatus(v as LeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...PIPELINE_STATUSES, "NOT_INTERESTED", "FOLLOW_UP"].map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s as LeadStatus]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Next follow-up</Label>
              <Input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
              <Button size="sm" className="mt-2" onClick={scheduleFollowUp}>
                Save follow-up
              </Button>
              {lead.nextFollowUpAt && (
                <p className="text-xs text-muted-foreground">
                  Scheduled: {format(new Date(lead.nextFollowUpAt), "d MMM yyyy, HH:mm")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {(lead.digitalPresence && Object.keys(lead.digitalPresence).length > 0) && (
        <Card>
          <CardHeader><CardTitle>Digital presence</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(lead.digitalPresence).map(([k, v]) => (
              <p key={k}>
                <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                {v}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Evidence</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1">
              {(lead.evidence ?? []).map((e, i) => (
                <li key={i}>
                  <a href={e.url} target="_blank" rel="noreferrer" className="underline">
                    {e.label ?? e.url}
                  </a>
                </li>
              ))}
            </ul>
            <Input placeholder="https://…" value={evidenceUrl} onChange={(ev) => setEvidenceUrl(ev.target.value)} />
            <Input placeholder="Label (optional)" value={evidenceLabel} onChange={(ev) => setEvidenceLabel(ev.target.value)} />
            <Button size="sm" onClick={addEvidence}>Add link</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Data provenance</CardTitle></CardHeader>
          <CardContent>
            <FieldProvenance meta={parseFieldMeta(lead.fieldMeta)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
            <Button size="sm" onClick={addNote}>Add note</Button>
            <div className="max-h-48 space-y-2 overflow-auto text-sm">
              {lead.notes.map((n) => (
                <div key={n.id} className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(n.createdAt), "d MMM yyyy, HH:mm")}
                  </p>
                  <p>{n.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent className="max-h-64 space-y-3 overflow-auto text-sm">
            {lead.activities.map((a) => (
              <div key={a.id} className="border-l-2 border-primary/30 pl-3">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(a.createdAt), "d MMM yyyy, HH:mm")}
                </p>
                <p className="font-medium">{a.title}</p>
                {a.description && <p className="text-muted-foreground">{a.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!contactDialog} onOpenChange={() => setContactDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record contact?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You opened {contactDialog?.label}. Optionally mark this lead as contacted and add notes.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={markContacted}
              onChange={(e) => setMarkContacted(e.target.checked)}
            />
            Mark as contacted
          </label>
          <Textarea
            placeholder="Notes (optional)"
            value={contactNotes}
            onChange={(e) => setContactNotes(e.target.value)}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setContactDialog(null)}>Skip</Button>
            <Button onClick={confirmContact}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
