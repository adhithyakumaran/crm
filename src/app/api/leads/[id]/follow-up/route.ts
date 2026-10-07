import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  dueAt: z.string().datetime(),
  note: z.string().optional(),
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

  const dueAt = new Date(parsed.data.dueAt);

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      nextFollowUpAt: dueAt,
      followUpNote: parsed.data.note,
      followUpCount: { increment: 1 },
      status: lead.status === "CONTACTED" || lead.status === "RESPONDED" ? "FOLLOW_UP" : lead.status,
      followUps: {
        create: { dueAt, note: parsed.data.note },
      },
      activities: {
        create: {
          type: "FOLLOW_UP_SCHEDULED",
          title: "Follow-up scheduled",
          description: parsed.data.note,
          metadata: { dueAt: dueAt.toISOString() },
        },
      },
    },
  });

  return NextResponse.json({ lead: updated });
}
