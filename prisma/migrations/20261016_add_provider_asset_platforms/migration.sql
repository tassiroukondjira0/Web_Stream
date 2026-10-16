-- Migration: Add platforms column to ProviderAsset
-- Adds platforms, a comma-wrapped list of streaming platform slugs
-- (ex: ",netflix,disney,") powering the platform filter
-- (Netflix, Prime Video, Disney+, Paramount+, Apple TV+).

ALTER TABLE "provider_assets"
  ADD COLUMN IF NOT EXISTS "platforms" TEXT;

-- Index for efficient platform filtering
CREATE INDEX IF NOT EXISTS "provider_assets_provider_contentType_platforms_idx"
  ON "provider_assets" ("provider", "contentType", "platforms");
