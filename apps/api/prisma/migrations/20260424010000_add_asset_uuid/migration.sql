-- AddColumn
ALTER TABLE "Asset" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- CreateIndex
CREATE UNIQUE INDEX "Asset_uuid_key" ON "Asset"("uuid");
