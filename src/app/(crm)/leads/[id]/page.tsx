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
import { toast } from "sonner";

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
  suggestedService: string | null;
  suggestedPitch: string | null;
  nextFollowUpAt: string | null;
  followUpNote: string | null;
  digitalPresence: Record<string, string> | null;
  social: Record<string, string> | null;
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

  const load = () => {
    if (!id) return;
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((d) => setLead(d.lead));
  };

  useEffect(load, [id]);

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
        <LeadScoreBadge score={lead.leadScore} />
        <StatusBadge status={lead.status} />
      </div>

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
          <CardHeader><CardTitle>Opportunity</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Detected problem</p>
              <p className="text-muted-foreground">{lead.detectedProblem ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium">Suggested service</p>
              <p className="text-muted-foreground">{lead.suggestedService ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium">Pitch angle</p>
              <p className="text-muted-foreground">{lead.suggestedPitch ?? "—"}</p>
            </div>
            {lead.scoreReason && (
              <p className="text-xs text-muted-foreground">Score: {lead.scoreReason}</p>
            )}
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
