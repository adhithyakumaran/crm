import { prisma } from "@/lib/db";

const DEFAULT_TAGS = [
  "HOT",
  "WEBSITE",
  "CHENNAI",
  "HIGH_VALUE",
  "CLINIC",
  "RESTAURANT",
];

/** Single-owner CRM: one user row, no login required. */
export async function ensureDefaultUser(): Promise<string> {
  const email = process.env.DEFAULT_USER_EMAIL ?? "owner@local.crm";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: "not-used",
      name: process.env.DEFAULT_USER_NAME ?? "Owner",
    },
  });

  await prisma.leadTag.createMany({
    data: DEFAULT_TAGS.map((name) => ({ userId: user.id, name })),
    skipDuplicates: true,
  });

  return user.id;
}
