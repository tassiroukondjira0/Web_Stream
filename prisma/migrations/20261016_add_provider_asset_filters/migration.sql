-- Migration: Add filtering columns to ProviderAsset
-- Adds categorySlug (genre), language (VF/VOSTFR/VO), and theme columns
-- for advanced catalog filtering (genre, language, theme, year).

ALTER TABLE "provider_assets"
  ADD COLUMN IF NOT EXISTS "categorySlug" TEXT,
  ADD COLUMN IF NOT EXISTS "language" TEXT,
  ADD COLUMN IF NOT EXISTS "theme" TEXT;

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS "provider_assets_provider_contentType_categorySlug_idx"
  ON "provider_assets" ("provider", "contentType", "categorySlug");

CREATE INDEX IF NOT EXISTS "provider_assets_provider_contentType_releaseYear_idx"
  ON "provider_assets" ("provider", "contentType", "releaseYear");
