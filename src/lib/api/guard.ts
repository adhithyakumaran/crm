import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";

const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 120, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export async function requireUser(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`api:${ip}`)) {
    return { error: NextResponse.json({ error: "Too many requests" }, { status: 429 }) };
  }

  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.userId };
}

export async function requireIngestKey(request: Request) {
  const key = request.headers.get("x-api-key");
  const expected = process.env.API_INGEST_KEY;
  if (!expected || !key || key !== expected) {
    return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    return { error: NextResponse.json({ error: "No user configured" }, { status: 503 }) };
  }
  const hash = createHash("sha256").update(key).digest("hex");
  await prisma.apiKey.upsert({
    where: { keyHash: hash },
    create: { userId: user.id, keyHash: hash, label: "ingest" },
    update: { lastUsed: new Date() },
  });
  return { userId: user.id };
}
