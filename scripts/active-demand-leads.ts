/**
 * Verified ACTIVE_DEMAND buyers (not job-seeker posts). Public LinkedIn sources only.
 */
import type { IncomingLeadRow } from "../src/lib/leads/upsert";

export const ACTIVE_DEMAND_LEADS: IncomingLeadRow[] = [
  {
    businessName: "KGS Private Limited",
    industry: "Corporate / Investment",
    city: "Chennai",
    state: "Tamil Nadu",
    phone: "+917092328577",
    leadIntelCategory: "ACTIVE_DEMAND",
    postedAt: "2026-07-20",
    postUrl:
      "https://www.linkedin.com/posts/navaneetha-krishifinvest_hiring-websitedeveloper-webdevelopment-activity-7484856512205479936-ze5L",
    postPlatform: "LinkedIn",
    postAuthor: "Navaneetha / KGS Private Limited",
    requirementSummary:
      "Corporate website with CMS, SEO, WhatsApp/contact forms, SSL, Google Maps — budget ₹30,000, 2–3 weeks.",
    postTextSummary:
      "KGS Private Limited is looking for a Website Developer or agency to build their official corporate website.",
    detectedProblem:
      "Company publicly soliciting a developer/agency for a new corporate website with CMS and integrations.",
    opportunityType: "WEBSITE",
    opportunityTypes: ["WEBSITE", "CRM"],
    buyingIntent: "VERY_HIGH",
    sourceType: "LINKEDIN",
    sourceUrl:
      "https://www.linkedin.com/posts/navaneetha-krishifinvest_hiring-websitedeveloper-webdevelopment-activity-7484856512205479936-ze5L",
    evidence: [
      {
        label: "LinkedIn requirement post",
        url: "https://www.linkedin.com/posts/navaneetha-krishifinvest_hiring-websitedeveloper-webdevelopment-activity-7484856512205479936-ze5L",
        type: "linkedin_post",
      },
    ],
  },
  {
    businessName: "DHI Creative Services",
    industry: "Creative Services",
    city: "Chennai",
    state: "Tamil Nadu",
    email: "selvaraj.veilumuthu@dhicreativeservices.com",
    leadIntelCategory: "ACTIVE_DEMAND",
    postedAt: "2026-03-03",
    postUrl:
      "https://www.linkedin.com/posts/dhi-creative-services_hiring-websitedeveloper-chennaijobs-activity-7434493489003937793-gTDL",
    postPlatform: "LinkedIn",
    postAuthor: "DHI Creative Services",
    requirementSummary:
      "Freelance/project website: modern responsive SEO-friendly site with CMS and performance optimization.",
    postTextSummary:
      "Seeking a skilled Website Developer in Chennai to design and develop a professional company website.",
    detectedProblem:
      "Public post requesting quotations for a business website build (buyer, not job applicant).",
    opportunityType: "WEBSITE",
    buyingIntent: "HIGH",
    sourceType: "LINKEDIN",
    sourceUrl:
      "https://www.linkedin.com/posts/dhi-creative-services_hiring-websitedeveloper-chennaijobs-activity-7434493489003937793-gTDL",
    evidence: [
      {
        label: "LinkedIn requirement post",
        url: "https://www.linkedin.com/posts/dhi-creative-services_hiring-websitedeveloper-chennaijobs-activity-7434493489003937793-gTDL",
        type: "linkedin_post",
      },
    ],
  },
  {
    businessName: "Chennai Outdoor Hoarding Inventory (premium sites)",
    industry: "Outdoor Advertising",
    city: "Chennai",
    state: "Tamil Nadu",
    location: "Chennai & Tiruvallur",
    leadIntelCategory: "ACTIVE_DEMAND",
    postedAt: "2026-06-07",
    postUrl:
      "https://www.linkedin.com/posts/thanigainathan-p-a57a65146_freelancedeveloper-websitedeveloper-wordpressdeveloper-activity-7469263849972465664-O-MW",
    postPlatform: "LinkedIn",
    postAuthor: "Thanigainathan P",
    requirementSummary:
      "Freelancer needed for hoarding inventory website: location pages, gallery, WhatsApp, enquiry forms, maps, SEO.",
    postTextSummary:
      "Premium outdoor advertising hoardings across Chennai & Tiruvallur — seeking freelancer for lead-generating business website.",
    detectedProblem:
      "Inventory-heavy business publicly requesting a developer for a lead-generation website.",
    opportunityType: "WEB_APPLICATION",
    buyingIntent: "HIGH",
    sourceType: "LINKEDIN",
    sourceUrl:
      "https://www.linkedin.com/posts/thanigainathan-p-a57a65146_freelancedeveloper-websitedeveloper-wordpressdeveloper-activity-7469263849972465664-O-MW",
    evidence: [
      {
        label: "LinkedIn requirement post",
        url: "https://www.linkedin.com/posts/thanigainathan-p-a57a65146_freelancedeveloper-websitedeveloper-wordpressdeveloper-activity-7469263849972465664-O-MW",
        type: "linkedin_post",
      },
    ],
  },
];
