-- Color-to-image matching (spec 006, US2)
-- Parallel array to `images`, index-aligned: image_colors[i] tags the color
-- of images[i], or null if untagged. No DB constraint enforces the pairing —
-- every write path (ImageUploader.tsx) must keep the two arrays in lockstep.
alter table products add column if not exists image_colors text[];
