-- Migration: Add isDuplicate flag to ProviderAsset
-- Marque un titre d'un catalogue externe comme doublon d'un fournisseur
-- prioritaire (ex. FRENCHSTREAM déjà présent dans TMDB). Masqué des grilles,
-- de la recherche et de la une sans toucher au choix de publication admin.

ALTER TABLE "provider_assets"
  ADD COLUMN IF NOT EXISTS "isDuplicate" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "provider_assets_provider_contentType_isDuplicate_idx"
  ON "provider_assets" ("provider", "contentType", "isDuplicate");
