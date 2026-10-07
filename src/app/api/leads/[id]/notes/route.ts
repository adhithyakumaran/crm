import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/guard";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ body: z.string().min(1) });

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({ where: { id, userId: auth.userId } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const note = await prisma.note.create({
    data: {
      leadId: id,
      body: parsed.data.body,
    },
  });

  await prisma.activity.create({
    data: {
      leadId: id,
      type: "NOTE_ADDED",
      title: "Note added",
      description: parsed.data.body,
    },
  });

  return NextResponse.json({ note });
}
