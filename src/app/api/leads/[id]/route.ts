import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";
import { parseFieldMeta, withFieldMeta } from "@/lib/leads/field-meta";
import type { LeadStatus, OpportunityType } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, userId: auth.userId },
    include: {
      contacts: true,
      sources: { orderBy: { createdAt: "desc" } },
      tagRelations: { include: { tag: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
      followUps: { orderBy: { dueAt: "desc" }, take: 20 },
      notes: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

const patchSchema = z.object({
  status: z.string().optional(),
  leadScore: z.number().min(0).max(100).optional(),
  scoreReason: z.string().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  followUpNote: z.string().optional(),
  businessName: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  detectedProblem: z.string().optional(),
  suggestedService: z.string().optional(),
  suggestedPitch: z.string().optional(),
  opportunityType: z.string().optional(),
  archived: z.boolean().optional(),
  contact: z
    .object({
      name: z.string().optional(),
      role: z.string().optional(),
      phone: z.string().optional(),
      whatsApp: z.string().optional(),
      email: z.string().optional(),
      linkedIn: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.lead.findFirst({
    where: { id, userId: auth.userId },
    include: { contacts: { where: { isPrimary: true }, take: 1 } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const meta = parseFieldMeta(existing.fieldMeta);
  const data: Record<string, unknown> = {};
  const userFields: string[] = [];

  for (const key of [
    "businessName",
    "industry",
    "description",
    "scoreReason",
    "detectedProblem",
    "suggestedService",
    "suggestedPitch",
    "followUpNote",
    "archived",
  ] as const) {
    if (parsed.data[key] !== undefined) {
      data[key] = parsed.data[key];
      userFields.push(key);
    }
  }

  if (parsed.data.leadScore !== undefined) {
    data.leadScore = parsed.data.leadScore;
    data.isHot = parsed.data.leadScore >= 90;
    userFields.push("leadScore");
  }

  if (parsed.data.nextFollowUpAt !== undefined) {
    data.nextFollowUpAt = parsed.data.nextFollowUpAt
      ? new Date(parsed.data.nextFollowUpAt)
      : null;
    userFields.push("nextFollowUpAt");
  }

  if (parsed.data.opportunityType) {
    data.opportunityType = parsed.data.opportunityType as OpportunityType;
    userFields.push("opportunityType");
  }

  let activityTitle: string | null = null;
  if (parsed.data.status && parsed.data.status !== existing.status) {
    data.status = parsed.data.status as LeadStatus;
    activityTitle = `Status changed: ${existing.status} → ${parsed.data.status}`;
    userFields.push("status");
  }

  if (userFields.length) {
    data.fieldMeta = withFieldMeta(
      meta,
      Object.fromEntries(userFields.map((f) => [f, "USER" as const]))
    );
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...data,
      activities: activityTitle
        ? {
            create: {
              type: "STATUS_CHANGED",
              title: activityTitle,
            },
          }
        : userFields.length
          ? {
              create: {
                type: "FIELD_UPDATED",
                title: "Lead updated",
              },
            }
          : undefined,
    },
  });

  if (parsed.data.contact) {
    const primary = existing.contacts[0];
    if (primary) {
      await prisma.contact.update({
        where: { id: primary.id },
        data: parsed.data.contact,
      });
    } else {
      await prisma.contact.create({
        data: { leadId: id, isPrimary: true, ...parsed.data.contact },
      });
    }
  }

  return NextResponse.json({ lead });
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  await prisma.lead.deleteMany({ where: { id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}
