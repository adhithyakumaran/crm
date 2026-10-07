-- CreateEnum
CREATE TYPE "LeadIntelCategory" AS ENUM ('BUSINESS_OPPORTUNITY', 'ACTIVE_DEMAND', 'BOTH');

-- CreateEnum
CREATE TYPE "BuyingIntent" AS ENUM ('VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('SMALL_WEBSITE', 'BUSINESS_WEBSITE', 'WEBSITE_REDESIGN', 'ECOMMERCE', 'SMALL_WEB_APP', 'BUSINESS_WEB_APP', 'MOBILE_APP', 'CUSTOM_SOFTWARE', 'AUTOMATION', 'ENTERPRISE_LITE', 'UNKNOWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OpportunityType" ADD VALUE 'WEBSITE_REDESIGN';
ALTER TYPE "OpportunityType" ADD VALUE 'WEB_APPLICATION';
ALTER TYPE "OpportunityType" ADD VALUE 'MOBILE_APPLICATION';
ALTER TYPE "OpportunityType" ADD VALUE 'BOOKING_SYSTEM';
ALTER TYPE "OpportunityType" ADD VALUE 'APPOINTMENT_SYSTEM';
ALTER TYPE "OpportunityType" ADD VALUE 'CRM';
ALTER TYPE "OpportunityType" ADD VALUE 'BUSINESS_DASHBOARD';
ALTER TYPE "OpportunityType" ADD VALUE 'INVENTORY_SYSTEM';
ALTER TYPE "OpportunityType" ADD VALUE 'ORDER_MANAGEMENT';
ALTER TYPE "OpportunityType" ADD VALUE 'CUSTOMER_PORTAL';
ALTER TYPE "OpportunityType" ADD VALUE 'CUSTOM_SOFTWARE';
ALTER TYPE "OpportunityType" ADD VALUE 'AI_SOLUTION';
ALTER TYPE "OpportunityType" ADD VALUE 'API_INTEGRATION';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "businessOpportunity" TEXT,
ADD COLUMN     "buyingIntent" "BuyingIntent" DEFAULT 'UNKNOWN',
ADD COLUMN     "intentScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leadIntelCategory" "LeadIntelCategory" DEFAULT 'BUSINESS_OPPORTUNITY',
ADD COLUMN     "opportunityTypes" JSONB,
ADD COLUMN     "postAuthor" TEXT,
ADD COLUMN     "postAuthorRole" TEXT,
ADD COLUMN     "postPlatform" TEXT,
ADD COLUMN     "postTextSummary" TEXT,
ADD COLUMN     "postUrl" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3),
ADD COLUMN     "projectType" "ProjectType",
ADD COLUMN     "requirementSummary" TEXT,
ADD COLUMN     "solutionNeeded" TEXT,
ADD COLUMN     "whyThisLead" TEXT;

-- CreateIndex
CREATE INDEX "Lead_userId_leadIntelCategory_idx" ON "Lead"("userId", "leadIntelCategory");

-- CreateIndex
CREATE INDEX "Lead_userId_intentScore_idx" ON "Lead"("userId", "intentScore");

-- CreateIndex
CREATE INDEX "Lead_userId_postedAt_idx" ON "Lead"("userId", "postedAt");
