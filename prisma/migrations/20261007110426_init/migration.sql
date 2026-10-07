-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'REVIEWED', 'CONTACTED', 'RESPONDED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'NOT_INTERESTED', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "LeadSourceType" AS ENUM ('GOOGLE_MAPS', 'LINKEDIN', 'INSTAGRAM', 'WEBSITE', 'DIRECTORY', 'MANUAL', 'CSV_IMPORT', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('WEBSITE', 'REDESIGN', 'WEB_APP', 'MOBILE_APP', 'AUTOMATION', 'ECOMMERCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('PHONE', 'WHATSAPP', 'EMAIL', 'LINKEDIN', 'INSTAGRAM', 'WEBSITE', 'GOOGLE_MAPS', 'OTHER');

-- CreateEnum
CREATE TYPE "FieldSource" AS ENUM ('SCRAPER', 'CSV', 'MANUAL', 'USER', 'API');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('IMPORTED', 'REVIEWED', 'STATUS_CHANGED', 'CONTACT_INITIATED', 'CONTACT_RECORDED', 'FOLLOW_UP_SCHEDULED', 'FOLLOW_UP_COMPLETED', 'NOTE_ADDED', 'FIELD_UPDATED', 'TAG_ADDED', 'TAG_REMOVED', 'ARCHIVED', 'DELETED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PREVIEW', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'default',
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "category" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "address" TEXT,
    "location" TEXT,
    "googleMapsUrl" TEXT,
    "website" TEXT,
    "websiteDomain" TEXT,
    "businessSize" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "scoreReason" TEXT,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "detectedProblem" TEXT,
    "suggestedSolution" TEXT,
    "suggestedService" TEXT,
    "suggestedPitch" TEXT,
    "opportunityType" "OpportunityType",
    "businessValue" TEXT,
    "digitalPresence" JSONB,
    "social" JSONB,
    "evidence" JSONB,
    "fieldMeta" JSONB,
    "normalizedPhone" TEXT,
    "normalizedEmail" TEXT,
    "matchKey" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "lastContactMethod" "ContactChannel",
    "nextFollowUpAt" TIMESTAMP(3),
    "followUpNote" TEXT,
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "whatsApp" TEXT,
    "email" TEXT,
    "linkedIn" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "LeadSourceType" NOT NULL,
    "sourceUrl" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTagRelation" (
    "leadId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "LeadTagRelation_pkey" PRIMARY KEY ("leadId","tagId")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "columnMap" JSONB,
    "summary" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "leadId" TEXT,
    "rowIndex" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "matchReason" TEXT,
    "raw" JSONB,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "Lead_userId_status_idx" ON "Lead"("userId", "status");

-- CreateIndex
CREATE INDEX "Lead_userId_leadScore_idx" ON "Lead"("userId", "leadScore");

-- CreateIndex
CREATE INDEX "Lead_userId_nextFollowUpAt_idx" ON "Lead"("userId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_userId_websiteDomain_idx" ON "Lead"("userId", "websiteDomain");

-- CreateIndex
CREATE INDEX "Lead_userId_normalizedPhone_idx" ON "Lead"("userId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "Lead_userId_normalizedEmail_idx" ON "Lead"("userId", "normalizedEmail");

-- CreateIndex
CREATE INDEX "Lead_userId_businessName_city_idx" ON "Lead"("userId", "businessName", "city");

-- CreateIndex
CREATE INDEX "Lead_userId_archived_idx" ON "Lead"("userId", "archived");

-- CreateIndex
CREATE INDEX "Contact_leadId_idx" ON "Contact"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadTag_userId_name_key" ON "LeadTag"("userId", "name");

-- CreateIndex
CREATE INDEX "Activity_leadId_createdAt_idx" ON "Activity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUp_leadId_dueAt_idx" ON "FollowUp"("leadId", "dueAt");

-- CreateIndex
CREATE INDEX "Note_leadId_createdAt_idx" ON "Note"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportRecord_importId_idx" ON "ImportRecord"("importId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSource" ADD CONSTRAINT "LeadSource_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTagRelation" ADD CONSTRAINT "LeadTagRelation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTagRelation" ADD CONSTRAINT "LeadTagRelation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "LeadTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
