-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'WRITE', 'READ');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_orgId_userId_key" ON "OrgMember"("orgId", "userId");

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: create a personal org for each existing user
INSERT INTO "Organization" ("id", "slug", "name", "createdAt")
SELECT 'org_' || "id", "username", "username", "createdAt"
FROM "User";

-- DataMigration: create OWNER membership for each user's personal org
INSERT INTO "OrgMember" ("id", "role", "orgId", "userId", "createdAt")
SELECT 'mbr_' || "id", 'OWNER'::"OrgRole", 'org_' || "id", "id", "createdAt"
FROM "User";

-- AddColumn: orgId to Asset (nullable first for data migration)
ALTER TABLE "Asset" ADD COLUMN "orgId" TEXT;

-- DataMigration: set orgId from ownerId
UPDATE "Asset" SET "orgId" = 'org_' || "ownerId";

-- MakeRequired: orgId on Asset
ALTER TABLE "Asset" ALTER COLUMN "orgId" SET NOT NULL;

-- AddForeignKey: Asset.orgId -> Organization
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex: old unique constraint
DROP INDEX "Asset_ownerId_slug_key";

-- CreateIndex: new unique constraint
CREATE UNIQUE INDEX "Asset_orgId_slug_key" ON "Asset"("orgId", "slug");

-- DropForeignKey: Asset.ownerId
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_ownerId_fkey";

-- DropColumn: ownerId from Asset
ALTER TABLE "Asset" DROP COLUMN "ownerId";

-- AddColumn: memberId to ApiKey (nullable first)
ALTER TABLE "ApiKey" ADD COLUMN "memberId" TEXT;

-- DataMigration: set memberId from userId (matching personal org member)
UPDATE "ApiKey" SET "memberId" = 'mbr_' || "userId";

-- MakeRequired: memberId on ApiKey
ALTER TABLE "ApiKey" ALTER COLUMN "memberId" SET NOT NULL;

-- AddForeignKey: ApiKey.memberId -> OrgMember
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrgMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey: ApiKey.userId
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropColumn: userId from ApiKey
ALTER TABLE "ApiKey" DROP COLUMN "userId";
