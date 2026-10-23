-- Migration: playback progress persistence
-- Stores the last known position per user / title / episode so the player can
-- resume where the viewer stopped. `mediaSlug` is free-form (no FK) to also
-- cover partner and TMDB catalogue entries.

CREATE TABLE IF NOT EXISTS "playback_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaSlug" TEXT NOT NULL,
    "episodeKey" TEXT NOT NULL DEFAULT '',
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "progressSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalSeconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playback_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "playback_progress_userId_mediaSlug_episodeKey_key"
    ON "playback_progress" ("userId", "mediaSlug", "episodeKey");

CREATE INDEX IF NOT EXISTS "playback_progress_userId_idx"
    ON "playback_progress" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playback_progress_userId_fkey'
  ) THEN
    ALTER TABLE "playback_progress"
      ADD CONSTRAINT "playback_progress_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
