/**
 * One-off lead research ingest — uses existing CRM upsert logic only.
 * Run: npx tsx scripts/ingest-chennai-research.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { ensureDefaultUser } from "../src/lib/auth/default-user";
import { findMatchingLead } from "../src/lib/leads/match";
import {
  upsertLeadFromImport,
  type IncomingLeadRow,
} from "../src/lib/leads/upsert";
import { prisma } from "../src/lib/db";

type RawLead = IncomingLeadRow & {
  sourceUrl?: string;
  isEnterprise?: boolean;
  websiteStatus?: string;
  tier?: string;
};

const ENTERPRISE = [
  /dhl/i,
  /thomas cook/i,
  /\bsotc\b/i,
  /aakash institute/i,
  /vedantu/i,
  /clove dental/i,
  /toni\s*&?\s*guy/i,
  /cult\.fit/i,
  /aarthiscan/i,
  /omega diagnostic/i,
  /apollo diagnostic/i,
  /southern travels/i,
  /homeone/i,
  /vvt coaching/i,
  /garudavega/i,
  /st courier/i,
  /lakme beauty/i,
  /naturals signature/i,
  /studio11/i,
  /orthosquare/i,
  /\bnarayana\b/i,
  /unacademy/i,
  /physics wallah/i,
  /\bcuemath\b/i,
  /homelane/i,
  /gomechanic/i,
  /kunhyundai/i,
  /nippon express/i,
  /db schenker/i,
  /kuehne/i,
  /joyalukkas/i,
  /\bgiva\.co/i,
  /kalyan jewellers/i,
  /saravana stores/i,
  /\btime4education\b/i,
  /\bfita\.in\b/i,
  /anytime fitness/i,
  /\bzolo\s*stays\b/i,
];

function inferArea(address?: string | null): string | undefined {
  if (!address) return undefined;
  const areas = [
    "Anna Nagar",
    "Velachery",
    "Adyar",
    "OMR",
    "Thoraipakkam",
    "Perungudi",
    "Sholinganallur",
    "T Nagar",
    "Kilpauk",
    "Ambattur",
    "Porur",
    "Guindy",
    "Mogappair",
    "Tambaram",
    "Chromepet",
    "Medavakkam",
    "Pallikaranai",
    "Mylapore",
    "Nungambakkam",
    "Egmore",
    "Vadapalani",
    "Kodambakkam",
    "ECR",
    "Kelambakkam",
  ];
  for (const a of areas) {
    if (address.toLowerCase().includes(a.toLowerCase())) return a;
  }
  return undefined;
}

function scoreLead(lead: RawLead): RawLead {
  let score = 48;
  const reasons: string[] = [];

  const name = lead.businessName.toLowerCase();
  const industry = (lead.industry ?? lead.category ?? "").toLowerCase();

  if (!lead.website) {
    score += 28;
    reasons.push("No public website found");
  } else if (
    /facebook\.com|justdial\.com|sulekha\.com|wheree\.com|lyzoo\.co|bharatibiz/i.test(
      lead.website
    )
  ) {
    score += 18;
    reasons.push("Relies on directory/social instead of owned site");
    lead.websiteStatus = "directory_only";
  } else if (lead.websiteStatus === "outdated") {
    score += 18;
    reasons.push("Outdated web presence");
  }

  if (industry.includes("pg") || industry.includes("hostel") || name.includes("pg")) {
    score += 12;
    reasons.push("PG/hostel — booking/enquiry systems are often manual");
  }
  if (industry.includes("real estate") || industry.includes("property")) {
    score += 10;
    reasons.push("Real estate — lead capture and listing UX matter");
  }
  if (industry.includes("event") || industry.includes("wedding")) {
    score += 8;
    reasons.push("Events — portfolio and enquiry funnels drive bookings");
  }
  if (industry.includes("coach") || industry.includes("education")) {
    score += 6;
  }
  if (industry.includes("clinic") || industry.includes("dental") || industry.includes("diagnostic")) {
    score += 10;
    reasons.push("Healthcare — appointment/enquiry flows are high value");
  }
  if (lead.phone) score += 8;
  if (lead.email) score += 5;

  const ind = `${industry} ${name}`;
  if (/interior|kitchen remodel/i.test(ind)) {
    score += 10;
    reasons.push("Interior — portfolio and lead funnel drive projects");
  }
  if (/automotive|car garage|repair shop/i.test(ind)) {
    score += 8;
    reasons.push("Auto workshop — booking/tracking sites convert walk-ins");
  }
  if (/shipping|freight|logistics|courier/i.test(ind)) {
    score += 8;
    reasons.push("Logistics — customer tracking and enquiry portals add value");
  }
  if (/tutoring|coaching|education/i.test(ind)) {
    score += 8;
  }
  if (/restaurant|fast food|catering/i.test(ind)) {
    score += 10;
    reasons.push("F&B — online menu/ordering often missing");
  }
  if (/salon|spa|beauty|hair/i.test(ind)) {
    score += 8;
    reasons.push("Salon/spa — online booking lifts conversions");
  }
  if (/gym|fitness/i.test(ind)) {
    score += 6;
  }
  if (/employment|recruitment/i.test(ind)) {
    score += 10;
    reasons.push("Recruitment — candidate/client portals are high value");
  }
  if (
    lead.website &&
    /^http:\/\//i.test(lead.website) &&
    !lead.websiteStatus
  ) {
    score += 12;
    lead.websiteStatus = "outdated";
    reasons.push("HTTP-only site — likely dated UX/mobile experience");
  }

  if (lead.isEnterprise || ENTERPRISE.some((r) => r.test(lead.businessName))) {
    score -= 45;
    reasons.push("Large/franchise brand — lower freelance fit");
  }

  score = Math.min(100, Math.max(0, score));
  lead.leadScore = score;

  if (!lead.detectedProblem) {
    lead.detectedProblem = reasons.slice(0, 3).join("; ") || "Visible room to improve digital lead capture";
  }
  if (!lead.suggestedService) {
    if (score >= 75 && !lead.website) {
      lead.suggestedService = "New business website + WhatsApp enquiry funnel";
    } else {
      lead.suggestedService = "Website redesign + enquiry/booking flow";
    }
  }
  if (!lead.suggestedPitch) {
    lead.suggestedPitch =
      `You already have demand in ${lead.city ?? "Chennai"} — a focused site with clear CTAs could convert more enquiries without extra ad spend.`;
  }
  if (!lead.scoreReason) {
    lead.scoreReason = reasons.join(". ");
  }
  lead.tier =
    score >= 80 ? "HOT" : score >= 70 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW";
  return lead;
}

function parseExaFiles(): RawLead[] {
  const dirs = [path.join(process.cwd(), "scripts/exa-snapshots")];
  const out: RawLead[] = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".txt") || f.endsWith(".md"))) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    if (text.includes("<!DOCTYPE") || !text.includes("Phone:")) continue;
    for (const block of text.split(/\n## /).slice(1)) {
      const businessName = block.split("\n")[0]?.trim();
      if (!businessName || businessName === "Search area") continue;
      const phoneM = block.match(/Phone: (\+\d+)/);
      const webM =
        block.match(/website (https?:\/\/[^\s,\)]+)/i) ??
        block.match(/URLs: website (https?:\/\/[^\s,\)]+)/i);
      const addrM = block.match(/Address: ([^\n(]+)/);
      const catM = block.match(/Categories: ([^\n]+)/);
      if (!phoneM) continue;
      const address = addrM?.[1]?.trim();
      const category = catM?.[1]?.split(",")[0]?.trim() ?? "Local business";
      out.push(
        scoreLead({
          businessName,
          category,
          industry: category,
          city: "Chennai",
          state: "Tamil Nadu",
          country: "India",
          address,
          location: inferArea(address)
            ? `${inferArea(address)}, Chennai`
            : "Chennai",
          phone: phoneM[1],
          website: webM?.[1],
          sourceType: "GOOGLE_MAPS",
          sourceUrl: webM?.[1] ?? `https://exa.ai/library/places`,
          opportunityType: "WEBSITE",
        })
      );
    }
  }
  }
  return out;
}

/** Public-web research (Oct 2026) — verified contact fields only */
const MANUAL: RawLead[] = [
  {
    businessName: "Brights PG / Hostel",
    industry: "PG / Hostel",
    category: "PG / Hostel",
    city: "Chennai",
    state: "Tamil Nadu",
    address: "AP-53, 5th Street, L Block, 12th Main Rd, Anna Nagar",
    phone: "+918838788921",
    email: "brightshostels@gmail.com",
    website: "https://brightspg.com/",
    sourceUrl: "https://brightspg.com/",
    sourceType: "WEBSITE",
    detectedProblem: "Booking relies on forms; no unified tenant portal or enquiry CRM",
    opportunityType: "WEB_APP",
  },
  {
    businessName: "T Stays Anna Nagar",
    industry: "PG / Hostel",
    city: "Chennai",
    address: "No-1545/C, Nithya Flats, Ram Nagar, Anna Nagar West",
    phone: "+919500050893",
    email: "thirumalastays@gmail.com",
    website: "https://www.tstays.in/mens-pg-anna-nagar/",
    sourceUrl: "https://www.tstays.in/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "GM Men's Hostel",
    industry: "PG / Hostel",
    city: "Chennai",
    address: "126/1 Avvai St, Anna Nagar West",
    phone: "+917305552746",
    website: "https://lyzoo.co.in/gmworkingmenshostel/",
    websiteStatus: "directory_only",
    sourceUrl: "https://lyzoo.co.in/gmworkingmenshostel/",
    sourceType: "DIRECTORY",
    detectedProblem: "Hosted on generic listing template — weak brand and booking UX",
  },
  {
    businessName: "Krisna Boys Hostel",
    industry: "PG / Hostel",
    city: "Chennai",
    address: "96, 9th Main Rd, Shanthi Colony, Anna Nagar",
    phone: "+919381730936",
    sourceUrl: "https://exa.ai/library/place/mr5wvqg2y2z",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Active PG with reviews but no owned website found",
  },
  {
    businessName: "SS Ladies Hostel",
    industry: "PG / Hostel",
    city: "Chennai",
    address: "No. 41, Z Block, 9th Street, 5th Avenue, Anna Nagar West",
    phone: "+918428982448",
    email: "enquiry@ssladieshostel.com",
    website: "https://ssladieshostel.com/",
    sourceUrl: "https://ssladieshostel.com/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Chennai Event Management Service",
    industry: "Event Management",
    city: "Chennai",
    address: "No.4, 2nd Street, Thangam Colony, Anna Nagar West",
    phone: "+919841435108",
    email: "info@chennaieventmanagementservice.com",
    website: "https://www.chennaieventmanagementservice.com/",
    sourceUrl: "https://www.chennaieventmanagementservice.com/wedding-management-planner",
    sourceType: "WEBSITE",
    opportunityType: "REDESIGN",
  },
  {
    businessName: "Vinayaka Weddings & Events",
    industry: "Wedding Planning",
    city: "Chennai",
    address: "297/206 NSK Salai, Kodambakkam",
    phone: "+919789479607",
    email: "vinayakaweddingsandevents@gmail.com",
    website: "https://vinayakaweddingsandevents.com/",
    sourceUrl: "https://vinayakaweddingsandevents.com/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Aki Event Management",
    industry: "Event Management",
    city: "Chennai",
    address: "40/73 W Madha Church St, Royapuram",
    phone: "+919344395663",
    email: "akieventmanagement@gmail.com",
    website: "https://www.akievents.com/",
    sourceUrl: "https://www.akievents.com/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Pranaya Weddings",
    industry: "Wedding Planning",
    city: "Chennai",
    address: "Kottivakkam",
    phone: "+919841079573",
    email: "sriram.kalyanasundaram@gmail.com",
    website: "https://www.pranayaweddings.com/",
    sourceUrl: "https://www.pranayaweddings.com/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "TamilNadu Routes",
    industry: "Travel Agency",
    city: "Chennai",
    address: "29, Annanagar Plaza, C47, 2nd Ave, Anna Nagar",
    phone: "+914449539484",
    website: "http://www.tamilnaduroutes.in/",
    sourceUrl: "http://www.tamilnaduroutes.in/",
    sourceType: "WEBSITE",
    detectedProblem: "Small tour operator site — likely needs modern packages and lead forms",
  },
  {
    businessName: "Angel Travels Anna Nagar",
    industry: "Travel Agency",
    city: "Chennai",
    address: "AB 145, Anna Nagar 3rd Main Rd",
    phone: "+919003027097",
    website: "http://www.angeltravels.in/",
    sourceUrl: "http://www.angeltravels.in/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Centaur Travels",
    industry: "Travel Agency",
    city: "Chennai",
    address: "AD-19/9, 5th Avenue, Anna Nagar",
    phone: "+914426202336",
    email: "abigoyal@sify.com",
    sourceUrl: "https://jupiteryellowdetail.com/search-by-listings/travel-agent-_-airlines-/anna-nagar-/centaur-travels/15456.jws",
    sourceType: "DIRECTORY",
    detectedProblem: "Long-established agency with directory listing — no modern site evident",
  },
  {
    businessName: "Vivek Estates",
    industry: "Real Estate",
    city: "Chennai",
    address: "AL-75, 11th Main Road, Anna Nagar",
    phone: "+919841051427",
    email: "nvrravi@gmail.com",
    sourceUrl: "https://www.jupiteryellowdetail.com/search-by-listings/real-estate-agencies-and-brokers-/anna-nagar-/vivek-estates/34594.jws",
    sourceType: "DIRECTORY",
  },
  {
    businessName: "JMJ Estates",
    industry: "Real Estate",
    city: "Chennai",
    address: "731 W-Block, 4th Street, Anna Nagar West Extension",
    phone: "+919884198831",
    sourceUrl: "https://www.jupiteryellowdetail.com/search-by-listings/real-estate-builders-and-developers-/anna-nagar-west-extension-/jmj-estates/14358.jws",
    sourceType: "DIRECTORY",
  },
  {
    businessName: "Om Sai Property Consultant",
    industry: "Real Estate",
    city: "Chennai",
    location: "OMR Navallur",
    phone: "+919790773686",
    website: "https://omsaipropertyconsultant.in/",
    sourceUrl: "https://omsaipropertyconsultant.in/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Chaitanya NEET IIT-JEE Academy",
    industry: "Coaching Institute",
    city: "Chennai",
    address: "42/S-4, X-Block, 2nd Floor, Sindur Shopping Center, Anna Nagar",
    phone: "+919940582758",
    email: "Chaitanyaneetiitjeeacademy2017@gmail.com",
    website: "https://chaitanyaneetacademy.in/",
    sourceUrl: "https://chaitanyaneetacademy.in/contact/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Priya Boutique Shop",
    industry: "Fashion Boutique",
    city: "Chennai",
    address: "No.30, Kilpauk Garden Road, Kilpauk",
    phone: "+919884650561",
    email: "atchara1228@gmail.com",
    sourceUrl: "https://www.bharatibiz.com/en/priya-boutique-shop-098846-50561",
    sourceType: "DIRECTORY",
    detectedProblem: "Listed on business directory only — no owned e-commerce/catalog site",
    opportunityType: "ECOMMERCE",
  },
  {
    businessName: "Anita Saree Boutique",
    industry: "Fashion Boutique",
    city: "Chennai",
    address: "66/A, Kilpauk Garden Road, Kilpauk",
    phone: "+914426448172",
    email: "sales@anitasarees.in",
    website: "https://www.anitasarees.in/",
    sourceUrl: "https://www.asklaila.com/listing/Chennai/kilpauk/anita-saree-boutique/00XR3Pkx/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Balaji Couriers",
    industry: "Logistics",
    city: "Chennai",
    address: "A-8, 3rd Phase, Thiru-Vi Ka Industrial Estate, Guindy",
    phone: "+917299726766",
    email: "rajuboss70@gmail.com",
    website: "http://bobcouriers.in/",
    sourceUrl: "http://bobcouriers.in/enquiry.php",
    sourceType: "WEBSITE",
    detectedProblem: "Basic courier site — customer tracking/portal opportunity",
    opportunityType: "WEB_APP",
  },
  {
    businessName: "Vimal Car Garage",
    industry: "Automobile Service",
    city: "Chennai",
    address: "2-B Redhills Road, Kallikuppam, Ambattur",
    phone: "+919941168061",
    email: "vimalcargarge@gmail.com",
    sourceUrl: "https://www.sulekha.com/vimal-car-garage-ambattur-chennai-contact-address",
    sourceType: "DIRECTORY",
    detectedProblem: "Strong local garage but discovery via Sulekha — needs owned booking site",
  },
  {
    businessName: "OMR Home Interiors",
    industry: "Interior Design",
    city: "Chennai",
    location: "Thoraipakkam, OMR",
    address: "38/103 Rajiv Gandhi Salai, Thoraipakkam",
    phone: "+919600005679",
    email: "enquiry@omrhomes.com",
    website: "https://www.omrhomes.com/",
    sourceUrl: "https://www.omrhomes.com/",
    sourceType: "WEBSITE",
    opportunityType: "REDESIGN",
    detectedProblem: "Mature interior brand — site UX/lead funnel can be modernized",
  },
  {
    businessName: "HomeOne Interiors (Adyar studio)",
    industry: "Interior Design",
    city: "Chennai",
    location: "OMR corridor",
    phone: "+918925824488",
    email: "support@homeone.store",
    website: "https://www.homeone.in/interior-designers-in-omr",
    sourceUrl: "https://www.homeone.in/interior-designers-in-omr",
    sourceType: "WEBSITE",
    isEnterprise: true,
  },
  {
    businessName: "Elite Realtors",
    industry: "Real Estate",
    city: "Chennai",
    address: "Ap 1207 Thendral Colony, 5th St, Anna Nagar West",
    phone: "+919840833750",
    sourceUrl: "https://elite-realtors-rera-registered.wheree.com/",
    sourceType: "DIRECTORY",
    website: "https://elite-realtors-rera-registered.wheree.com/",
    websiteStatus: "directory_only",
  },
  {
    businessName: "Wedding Aaha",
    industry: "Wedding Planning",
    city: "Chennai",
    address: "A5 Ganesh Apartments, N Mada St, Mylapore",
    phone: "+919940662455",
    email: "info@weddingaaha.com",
    website: "https://www.weddingaaha.com/",
    sourceUrl: "https://www.weddingaaha.com/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "No1 Challenge Fitness Studio",
    industry: "Gym",
    city: "Chennai",
    address: "5058 G Block, 18th Street, Anna Nagar West",
    phone: "+919840576888",
    website: "https://www.no1challengefitnessstudio.com/",
    sourceUrl: "https://www.no1challengefitnessstudio.com/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Second Home PG",
    industry: "PG / Hostel",
    city: "Chennai",
    location: "Anna Nagar West",
    address: "AP-656, H Block, 13th Main road, 11th St, Anna Nagar West",
    phone: "+919004725890",
    sourceUrl: "https://exa.ai/library/place/q59h2221h2z",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Active PG with reviews but no owned website listed",
  },
  {
    businessName: "Pentos Womens Hostel",
    industry: "PG / Hostel",
    city: "Chennai",
    address: "1266, 32nd St, Anna Nagar West, I Block",
    phone: "+919342757797",
    email: "pentoswomenspg@gmail.com",
    website: "https://pentoswomenspg.com/",
    sourceUrl: "https://pentoswomenspg.com/",
    sourceType: "WEBSITE",
    opportunityType: "WEB_APP",
    detectedProblem: "PG site — room availability/tenant enquiry workflow can be streamlined",
  },
  {
    businessName: "EDS Placements Pvt Ltd",
    industry: "Recruitment Agency",
    city: "Chennai",
    address: "46/101/2, 2nd Ave, Block W, Anna Nagar",
    phone: "+914442612288",
    sourceUrl: "https://exa.ai/library/place/hcp4btrw4s6",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Employment agency with phone listing — no public website found",
  },
  {
    businessName: "TalentAll Recruitment Services",
    industry: "Recruitment Agency",
    city: "Chennai",
    address: "215, AH Block 2nd St, Anna Nagar",
    phone: "+919841034918",
    email: "hello@talent-all.com",
    website: "http://www.talent-all.com/",
    sourceUrl: "https://exa.ai/library/place/8s3cvcy8hln",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Chennai Hot Jobs",
    industry: "Recruitment Agency",
    city: "Chennai",
    address: "AG Block, 7th Main Road, Shanthi Colony, Anna Nagar",
    phone: "+914443518665",
    sourceUrl: "https://exa.ai/library/place/9c88tv883l1",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Recruitment shop — no modern candidate portal evident",
  },
  {
    businessName: "Devas Consultancy",
    industry: "Recruitment Agency",
    city: "Chennai",
    address: "C-47, 1st Floor, Anna Nagar Plaza, 2nd Avenue, Anna Nagar",
    phone: "+914445500215",
    sourceUrl:
      "https://www.jupiteryellowdetail.com/chennai/search-by-listings/recruitment-agency-/anna-nagar-/devas-consultancy/51191.jws",
    sourceType: "DIRECTORY",
    detectedProblem: "Directory-only presence — opportunity for careers microsite",
  },
  {
    businessName: "The Wedding Experience",
    industry: "Wedding Planning",
    city: "Chennai",
    location: "ECR / Tiruvanmiyur",
    address: "2nd Floor, Plot 321, E 4th Main Rd",
    phone: "+919867018889",
    email: "info@theweddingexperience.in",
    sourceUrl: "https://exa.ai/library/place/2dy8ml2ch41",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Strong reviews but booking via Instagram — no owned website",
    opportunityType: "WEBSITE",
  },
  {
    businessName: "YR Events",
    industry: "Event Management",
    city: "Chennai",
    location: "Adyar",
    address: "Old No 30, New No 55, Teachers Colony, Adyar",
    phone: "+917358669965",
    website: "https://yrevents.co.in/",
    sourceUrl: "https://exa.ai/library/place/qwdbhbf4g7l",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Raaj Academy",
    industry: "Coaching Institute",
    city: "Chennai",
    address: "1193, IInd Floor, H Block 12th Main Rd, Anna Nagar",
    phone: "+919840334717",
    website: "http://www.raajacademy.com/",
    sourceUrl: "https://exa.ai/library/places?q=3146377f4e60f18a",
    sourceType: "WEBSITE",
    opportunityType: "REDESIGN",
  },
  {
    businessName: "Prakash Maths Tuition",
    industry: "Coaching Institute",
    city: "Chennai",
    address: "Government Rental Quarters, 606, C-43, Anna Nagar",
    phone: "+917904465952",
    website: "http://prakashmathstuition.com/",
    sourceUrl: "https://exa.ai/library/places?q=3146377f4e60f18a",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Prosperty Real Estate",
    industry: "Real Estate",
    city: "Chennai",
    address: "AP 676, 15th Street, H Block, Anna Nagar",
    phone: "+919884047460",
    website: "http://www.prospertyrealestate.com/",
    sourceUrl: "https://exa.ai/library/places?q=3a63a9a141bad06d",
    sourceType: "WEBSITE",
  },
  {
    businessName: "NVR Real Estate",
    industry: "Real Estate",
    city: "Chennai",
    address: "391/b School Road, Anna Nagar West Extension",
    phone: "+919677777774",
    website: "http://nvrrealestate.com/",
    sourceUrl: "https://exa.ai/library/places?q=3a63a9a141bad06d",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Genuine Property Consultant",
    industry: "Real Estate",
    city: "Chennai",
    address: "No G9, 5B, 2nd Ave, near Tower Park, Anna Nagar",
    phone: "+919884851146",
    sourceUrl: "https://exa.ai/library/places?q=3a63a9a141bad06d",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Rated agency with phone — no website in listing",
  },
  {
    businessName: "Vaigai Real Estate",
    industry: "Real Estate",
    city: "Chennai",
    address: "82, 4th Main Rd, Anna Nagar",
    phone: "+919840721630",
    sourceUrl: "https://exa.ai/library/place/p6p9jxz2jq2",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Local broker — no owned site listed",
  },
  {
    businessName: "Chennai Properties Online",
    industry: "Real Estate",
    city: "Chennai",
    address: "76 A, 9th St, Z Block, Anna Nagar West",
    phone: "+919962454789",
    website: "http://chennaipropertiesonline.in/",
    sourceUrl: "https://exa.ai/library/place/krgx4qyyffj",
    sourceType: "WEBSITE",
  },
  {
    businessName: "ApjXpress Couriers",
    industry: "Logistics",
    city: "Chennai",
    location: "Guindy",
    address: "Alandur Rd, SIDCO Industrial Estate, Guindy",
    phone: "+919205350535",
    sourceUrl: "https://exa.ai/library/place/kdtgmlq4866",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Growing courier — no customer tracking portal listed",
    opportunityType: "WEB_APP",
  },
  {
    businessName: "Worldwide Logistics (WWL)",
    industry: "Logistics",
    city: "Chennai",
    location: "Guindy",
    phone: "+914422328888",
    website: "http://www.go2wwl.com/",
    sourceUrl: "https://exa.ai/library/places?q=15174c4f8f94bf90",
    sourceType: "WEBSITE",
    opportunityType: "REDESIGN",
  },
  {
    businessName: "GM Car A/C Service",
    industry: "Automobile Service",
    city: "Chennai",
    location: "Ambattur / Kallikuppam",
    address: "12A, Gangai Amman Kovil Street, Kallikuppam",
    phone: "+918428000085",
    email: "gmautocool@gmail.com",
    website: "https://gmcaracservice.com/",
    sourceUrl: "https://gmcaracservice.com/contact",
    sourceType: "WEBSITE",
  },
  {
    businessName: "R Square Academy (Velachery)",
    industry: "Coaching Institute",
    city: "Chennai",
    location: "Velachery",
    address: "24/6, Tharamani Link, 100 Feet Rd, Tansi Nagar, Velachery",
    phone: "+917448626364",
    email: "Info@rsquareacademy.in",
    website: "https://rsquareacademy.in/rsquare-academy-velachery/",
    sourceUrl: "https://rsquareacademy.in/rsquare-academy-velachery/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Appolo Academy",
    industry: "Coaching Institute",
    city: "Chennai",
    location: "Velachery",
    address: "181, Advent Church Complex, Gandhi Road, Velachery",
    phone: "+919500704040",
    email: "appoloacademy@gmail.com",
    website: "https://www.appoloacademy.com/",
    sourceUrl: "https://www.appoloacademy.com/",
    sourceType: "WEBSITE",
  },
  {
    businessName: "Value Health Care Dental",
    industry: "Dental Clinic",
    city: "Chennai",
    address: "22, 2nd Main Rd, behind Valli Ammal College, Anna Nagar",
    phone: "+917397107666",
    website: "http://vhcdentalden.in/",
    sourceUrl: "https://exa.ai/library/places?q=f63ae04b1630b28f",
    sourceType: "WEBSITE",
    detectedProblem: "HTTP clinic site — appointment UX can be modernized",
    opportunityType: "WEB_APP",
  },
  {
    businessName: "Cliqodent Dental Office",
    industry: "Dental Clinic",
    city: "Chennai",
    address: "45, A block, 3rd Avenue, Anna Nagar",
    phone: "+919600068206",
    sourceUrl: "https://exa.ai/library/places?q=f63ae04b1630b28f",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Highly rated clinic — no website in public listing",
    opportunityType: "WEBSITE",
  },
  {
    businessName: "The Tidy Spa And Salon",
    industry: "Salon / Spa",
    city: "Chennai",
    address: "3rd floor, Sam Noah tower, B5, 2nd Ave, Anna Nagar West",
    phone: "+919840491282",
    sourceUrl: "https://exa.ai/library/place/8pgfxffjtf0",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Spa with strong ratings — no website listed",
    opportunityType: "WEB_APP",
  },
  {
    businessName: "Hotspot Restaurant",
    industry: "Restaurant",
    city: "Chennai",
    location: "Tambaram",
    address: "New Market Nagar, Tambaram",
    phone: "+919500115209",
    sourceUrl: "https://exa.ai/library/place/40np0d76rr1",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Local restaurant — no website or online ordering",
    opportunityType: "WEBSITE",
  },
  {
    businessName: "Akka Kadai",
    industry: "Restaurant",
    city: "Chennai",
    location: "Tambaram",
    address: "No.4, IAF Rd, East Tambaram",
    phone: "+917397260842",
    sourceUrl: "https://exa.ai/library/place/pl53f158vzf",
    sourceType: "GOOGLE_MAPS",
    detectedProblem: "Popular fast-food spot — digital menu/ordering opportunity",
  },
];

async function main() {
  const userId = await ensureDefaultUser();
  const parsed = parseExaFiles();
  const combined = [...MANUAL, ...parsed].map((l) =>
    scoreLead({
      ...l,
      city: l.city ?? "Chennai",
      state: l.state ?? "Tamil Nadu",
      country: l.country ?? "India",
      sourceType: l.sourceType ?? "OTHER",
    })
  );

  const byPhone = new Map<string, RawLead>();
  for (const l of combined) {
    const key = l.phone?.replace(/\D/g, "") ?? l.businessName;
    const existing = byPhone.get(key);
    if (!existing || (l.leadScore ?? 0) > (existing.leadScore ?? 0)) {
      byPhone.set(key, l);
    }
  }

  const qualified = [...byPhone.values()].filter(
    (l) => (l.leadScore ?? 0) >= 60 && l.tier !== "LOW"
  );

  qualified.sort((a, b) => (b.leadScore ?? 0) - (a.leadScore ?? 0));

  const stats = {
    researched: combined.length,
    qualified: qualified.length,
    created: 0,
    updated: 0,
    skippedLow: combined.length - qualified.length,
    duplicatesSkipped: 0,
    hot: 0,
    high: 0,
  };

  const top: Array<{
    businessName: string;
    score: number;
    opportunity: string;
    reason: string;
    contact: string;
  }> = [];

  for (const lead of qualified) {
    if (lead.tier === "HOT") stats.hot++;
    if (lead.tier === "HIGH") stats.high++;

    const match = await findMatchingLead(userId, {
      businessName: lead.businessName,
      website: lead.website,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      address: lead.address,
    });

    const result = await upsertLeadFromImport(userId, lead, "API");
    if (match) stats.duplicatesSkipped++;
    if (result.action === "created") stats.created++;
    else stats.updated++;

    if (top.length < 20) {
      top.push({
        businessName: lead.businessName,
        score: lead.leadScore ?? 0,
        opportunity: lead.suggestedService ?? lead.opportunityType ?? "WEBSITE",
        reason: (lead.scoreReason ?? "").slice(0, 120),
        contact: [lead.phone, lead.email].filter(Boolean).join(" · "),
      });
    }

  }

  console.log(JSON.stringify({ stats, top20: top }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
