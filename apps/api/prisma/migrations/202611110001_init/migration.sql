CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');
CREATE TABLE "Company" (
 "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "User" (
 "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
 "role" "Role" NOT NULL, "companyId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "User_client_company_check" CHECK ("role" <> 'CLIENT' OR "companyId" IS NOT NULL)
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE TABLE "Branch" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL, "address" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Branch_companyId_idx" ON "Branch"("companyId");
CREATE TABLE "DailyMetric" (
 "id" TEXT PRIMARY KEY, "branchId" TEXT NOT NULL, "date" DATE NOT NULL,
 "views" INTEGER NOT NULL, "websiteClicks" INTEGER NOT NULL, "calls" INTEGER NOT NULL, "routes" INTEGER NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DailyMetric_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "DailyMetric_nonnegative" CHECK ("views" >= 0 AND "websiteClicks" >= 0 AND "calls" >= 0 AND "routes" >= 0)
);
CREATE UNIQUE INDEX "DailyMetric_branchId_date_key" ON "DailyMetric"("branchId", "date");
CREATE INDEX "DailyMetric_date_idx" ON "DailyMetric"("date");
CREATE TABLE "Review" (
 "id" TEXT PRIMARY KEY, "branchId" TEXT NOT NULL, "rating" INTEGER NOT NULL, "text" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PUBLISHED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Review_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
 CONSTRAINT "Review_status_check" CHECK ("status" IN ('PUBLISHED', 'PENDING', 'HIDDEN'))
);
CREATE INDEX "Review_branchId_createdAt_idx" ON "Review"("branchId", "createdAt");
