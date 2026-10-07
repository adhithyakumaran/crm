import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { ensureDefaultUser } from "@/lib/auth/default-user";
import { prisma } from "@/lib/db";

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

  try {
    const userId = await ensureDefaultUser();
    return { userId };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Database unavailable. Set DATABASE_URL on the server." },
        { status: 503 }
      ),
    };
  }
}

export async function requireIngestKey(request: Request) {
  const key = request.headers.get("x-api-key");
  const expected = process.env.API_INGEST_KEY;
  if (expected && key && key === expected) {
    const userId = await ensureDefaultUser();
    const hash = createHash("sha256").update(key).digest("hex");
    await prisma.apiKey.upsert({
      where: { keyHash: hash },
      create: { userId, keyHash: hash, label: "ingest" },
      update: { lastUsed: new Date() },
    });
    return { userId };
  }
  return requireUser(request);
}
