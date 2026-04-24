-- AddColumn: keyPrefix to ApiKey (nullable first for existing rows)
ALTER TABLE "ApiKey" ADD COLUMN "keyPrefix" TEXT;

-- Backfill: use first 16 chars of keyHash as a placeholder prefix for existing keys
UPDATE "ApiKey" SET "keyPrefix" = LEFT("keyHash", 16) WHERE "keyPrefix" IS NULL;

-- MakeRequired
ALTER TABLE "ApiKey" ALTER COLUMN "keyPrefix" SET NOT NULL;
