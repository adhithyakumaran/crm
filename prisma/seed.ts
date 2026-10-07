import "dotenv/config";
import { LeadSourceType } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.env.DEFAULT_USER_EMAIL ?? "you@example.com";
  const password = process.env.DEFAULT_USER_PASSWORD ?? "changeme123";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await hashPassword(password),
      name: "Parthiban",
    },
  });

  await prisma.leadTag.createMany({
    data: [
      "HOT",
      "WEBSITE",
      "CHENNAI",
      "HIGH_VALUE",
      "CLINIC",
      "RESTAURANT",
    ].map((name) => ({ userId: user.id, name })),
    skipDuplicates: true,
  });

  const existing = await prisma.lead.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log("Seed skipped — leads already exist");
    return;
  }

  const samples = [
    {
      businessName: "Velvet Interiors Studio",
      industry: "Interior Design",
      city: "Chennai",
      state: "Tamil Nadu",
      leadScore: 92,
      detectedProblem:
        "Portfolio site loads slowly on mobile and has no enquiry funnel.",
      suggestedService: "Website redesign + lead enquiry system",
      suggestedPitch:
        "You have strong project photos — a faster mobile site with WhatsApp enquiry could convert more walk-ins.",
      phone: "+91 98400 11223",
      email: "hello@velvetinteriors.in",
      website: "https://velvetinteriors.in",
      status: "NEW" as const,
      sourceType: LeadSourceType.GOOGLE_MAPS,
    },
    {
      businessName: "Spice Route Bistro",
      industry: "Restaurant",
      city: "Chennai",
      state: "Tamil Nadu",
      leadScore: 78,
      detectedProblem: "No online table booking; menu PDF only.",
      suggestedService: "Restaurant website + booking widget",
      phone: "+91 90031 44556",
      website: "https://spiceroutebistro.com",
      status: "REVIEWED" as const,
      sourceType: LeadSourceType.CSV_IMPORT,
    },
    {
      businessName: "SmileCare Dental Clinic",
      industry: "Healthcare",
      city: "Coimbatore",
      state: "Tamil Nadu",
      leadScore: 85,
      detectedProblem: "Outdated WordPress theme; appointment form broken on iOS.",
      suggestedService: "Clinic website rebuild + appointment flow",
      phone: "+91 94422 77889",
      email: "care@smilecareclinic.com",
      status: "CONTACTED" as const,
      sourceType: LeadSourceType.LINKEDIN,
    },
  ];

  for (const s of samples) {
    await prisma.lead.create({
      data: {
        userId: user.id,
        businessName: s.businessName,
        industry: s.industry,
        category: s.industry,
        city: s.city,
        state: s.state,
        location: `${s.city}, ${s.state}`,
        country: "India",
        website: s.website,
        websiteDomain: s.website?.replace(/^https?:\/\/(www\.)?/, "").split("/")[0],
        leadScore: s.leadScore,
        isHot: s.leadScore >= 90,
        detectedProblem: s.detectedProblem,
        suggestedService: s.suggestedService,
        suggestedPitch: s.suggestedPitch,
        status: s.status,
        normalizedPhone: s.phone?.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1"),
        normalizedEmail: s.email?.toLowerCase(),
        contacts: {
          create: {
            name: "Owner",
            phone: s.phone,
            whatsApp: s.phone,
            email: s.email,
            isPrimary: true,
          },
        },
        sources: { create: { type: s.sourceType } },
        activities: {
          create: { type: "IMPORTED", title: "Sample lead seeded" },
        },
      },
    });
  }

  console.log(`Seeded user ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
