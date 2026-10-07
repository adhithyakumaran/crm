import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";
import type { LeadStatus } from "@prisma/client";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["status", "tag", "followUp", "archive", "delete"]),
  status: z.string().optional(),
  tag: z.string().optional(),
  followUpAt: z.string().datetime().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { ids, action } = parsed.data;
  const where = { id: { in: ids }, userId: auth.userId };

  if (action === "delete") {
    await prisma.lead.deleteMany({ where });
    return NextResponse.json({ ok: true });
  }

  if (action === "archive") {
    await prisma.lead.updateMany({ where, data: { archived: true } });
    return NextResponse.json({ ok: true });
  }

  if (action === "status" && parsed.data.status) {
    await prisma.lead.updateMany({
      where,
      data: { status: parsed.data.status as LeadStatus },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "followUp" && parsed.data.followUpAt) {
    await prisma.lead.updateMany({
      where,
      data: { nextFollowUpAt: new Date(parsed.data.followUpAt) },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "tag" && parsed.data.tag) {
    const tag = await prisma.leadTag.upsert({
      where: { userId_name: { userId: auth.userId, name: parsed.data.tag } },
      create: { userId: auth.userId, name: parsed.data.tag },
      update: {},
    });
    await prisma.leadTagRelation.createMany({
      data: ids.map((leadId) => ({ leadId, tagId: tag.id })),
      skipDuplicates: true,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
