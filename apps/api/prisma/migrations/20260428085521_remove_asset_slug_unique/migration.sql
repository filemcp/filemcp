-- DropIndex
DROP INDEX "Asset_orgId_slug_key";

-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Asset_orgId_slug_idx" ON "Asset"("orgId", "slug");
