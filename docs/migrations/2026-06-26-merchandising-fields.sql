-- Add merchandising fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_category    text,
  ADD COLUMN IF NOT EXISTS is_trending         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new_arrival      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS collection_name     text,
  ADD COLUMN IF NOT EXISTS new_arrival_start   date,
  ADD COLUMN IF NOT EXISTS new_arrival_end     date,
  ADD COLUMN IF NOT EXISTS no_restock          boolean NOT NULL DEFAULT false;
