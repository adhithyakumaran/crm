import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";
import type { ContactChannel, LeadStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  channel: z.enum([
    "PHONE",
    "WHATSAPP",
    "EMAIL",
    "LINKEDIN",
    "INSTAGRAM",
    "WEBSITE",
    "GOOGLE_MAPS",
    "OTHER",
  ]),
  notes: z.string().optional(),
  markContacted: z.boolean().default(true),
  status: z.string().optional(),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({ where: { id, userId: auth.userId } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const channel = parsed.data.channel as ContactChannel;

  const update: Record<string, unknown> = {
    lastContactedAt: now,
    lastContactMethod: channel,
  };

  if (parsed.data.markContacted) {
    const nextStatus =
      (parsed.data.status as LeadStatus) ??
      (lead.status === "NEW" || lead.status === "REVIEWED" ? "CONTACTED" : lead.status);
    update.status = nextStatus;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...update,
      activities: {
        create: {
          type: parsed.data.markContacted ? "CONTACT_RECORDED" : "CONTACT_INITIATED",
          title: parsed.data.markContacted
            ? `Contact recorded via ${channel}`
            : `${channel} contact initiated`,
          description: parsed.data.notes,
          metadata: { channel },
        },
      },
      notes: parsed.data.notes
        ? { create: { body: parsed.data.notes } }
        : undefined,
    },
  });

  return NextResponse.json({ lead: updated });
}
