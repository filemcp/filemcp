-- AddColumn
ALTER TABLE "Asset" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex (keyPrefix index was added to schema but never migrated)
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
