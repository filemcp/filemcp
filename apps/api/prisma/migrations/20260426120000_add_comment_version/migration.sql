-- Add versionId column nullable so we can backfill safely
ALTER TABLE "Comment" ADD COLUMN "versionId" TEXT;

-- Backfill top-level comments: assign each to the latest version that existed when the comment was created
UPDATE "Comment" c
SET "versionId" = (
  SELECT v.id FROM "Version" v
  WHERE v."assetId" = c."assetId" AND v."createdAt" <= c."createdAt"
  ORDER BY v.number DESC
  LIMIT 1
)
WHERE c."parentId" IS NULL;

-- Replies inherit versionId from their parent (a reply belongs to the same version-thread as the comment it replies to)
UPDATE "Comment" c
SET "versionId" = (
  SELECT p."versionId" FROM "Comment" p WHERE p.id = c."parentId"
)
WHERE c."parentId" IS NOT NULL;

-- Final fallback for any orphans (comments older than any version somehow): assign to v1 of the asset
UPDATE "Comment" c
SET "versionId" = (
  SELECT v.id FROM "Version" v
  WHERE v."assetId" = c."assetId"
  ORDER BY v.number ASC
  LIMIT 1
)
WHERE c."versionId" IS NULL;

-- Lock it in
ALTER TABLE "Comment" ALTER COLUMN "versionId" SET NOT NULL;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "Version"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Comment_versionId_idx" ON "Comment"("versionId");
