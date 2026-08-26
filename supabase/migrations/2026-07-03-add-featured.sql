-- Add Featured designation (specs/003-merchandising-badges-v2, US5).
-- Mirrors the existing is_new_arrival / new_arrival_start / new_arrival_end
-- pattern exactly — same nullable-bounds semantics, same query shape already
-- proven by getNewArrivalProducts().

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_start timestamptz,
  ADD COLUMN IF NOT EXISTS featured_end timestamptz;
