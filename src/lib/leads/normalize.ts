export function normalizePhone(input?: string | null): string | null {
  if (!input?.trim()) return null;
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export function normalizeEmail(input?: string | null): string | null {
  if (!input?.trim()) return null;
  const email = input.trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
}

export function extractDomain(website?: string | null): string | null {
  if (!website?.trim()) return null;
  try {
    const url = website.includes("://") ? website : `https://${website}`;
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return host || null;
  } catch {
    const cleaned = website
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    return cleaned || null;
  }
}

export function normalizeBusinessName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function similarityScore(a: string, b: string): number {
  const x = normalizeBusinessName(a);
  const y = normalizeBusinessName(b);
  if (x === y) return 1;
  const longer = x.length > y.length ? x : y;
  const shorter = x.length > y.length ? y : x;
  if (!longer.length) return 0;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  const setA = new Set(x.split(" "));
  const setB = new Set(y.split(" "));
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  return inter / Math.max(setA.size, setB.size);
}

export function scoreEmoji(score: number): string {
  if (score >= 90) return "🔥";
  if (score >= 75) return "🟢";
  if (score >= 60) return "🟡";
  return "⚪";
}

export function whatsAppUrl(phone?: string | null): string | null {
  const n = normalizePhone(phone);
  if (!n) return null;
  return `https://wa.me/${n}`;
}
