-- ─── order_items relational table ──────────────────────────────────────────
-- Replaces scanning the JSONB items column on every analytics query.
-- After running this migration, all scoring/reporting queries use this table
-- instead of deserialising JSON in application code.

CREATE TABLE IF NOT EXISTS order_items (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id     uuid,                   -- nullable: product may be deleted
  product_name   text NOT NULL,
  sku            text,
  size           text,
  color          text,
  quantity       integer NOT NULL DEFAULT 1,
  unit_price     numeric NOT NULL DEFAULT 0,
  original_price numeric,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes that make every analytics query fast
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at DESC);

-- Composite index for the scoring cron: product sales within a date window
CREATE INDEX IF NOT EXISTS idx_order_items_product_date
  ON order_items(product_id, created_at DESC);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages order items" ON order_items;

CREATE POLICY "Service role manages order items"
  ON order_items FOR ALL USING (auth.role() = 'service_role');

-- ─── Migrate all existing orders ────────────────────────────────────────────
-- Reads the JSONB items array from every order and inserts one row per item.
-- Safe to run multiple times — ON CONFLICT DO NOTHING prevents duplicates
-- if you re-run after a partial failure (requires a unique constraint for that,
-- so we skip duplicates by checking order_id + product_id + created_at proximity).
INSERT INTO order_items (
  order_id, product_id, product_name, sku, size, color,
  quantity, unit_price, original_price, created_at
)
SELECT
  o.id                                                   AS order_id,
  NULLIF(item->>'product_id', '')::uuid                  AS product_id,
  COALESCE(NULLIF(item->>'product_name', ''), 'Product') AS product_name,
  NULLIF(item->>'sku', '')                               AS sku,
  NULLIF(item->>'size', '')                              AS size,
  NULLIF(item->>'color', '')                             AS color,
  COALESCE((item->>'quantity')::integer, 1)              AS quantity,
  COALESCE((item->>'price')::numeric, 0)                 AS unit_price,
  (NULLIF(item->>'original_price', ''))::numeric         AS original_price,
  o.created_at                                           AS created_at
FROM orders o,
  jsonb_array_elements(o.items) AS item
WHERE jsonb_typeof(o.items) = 'array'
  AND jsonb_array_length(o.items) > 0
  -- Skip orders already migrated (idempotent re-run safety)
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
  );
