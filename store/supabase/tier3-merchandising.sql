-- ─── Customer Waitlist ───────────────────────────────────────────────────────
-- Stores back-in-stock requests. Unique per (product, email) so duplicate
-- signups are silently ignored on upsert.
CREATE TABLE IF NOT EXISTS product_waitlist (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  email       text NOT NULL,
  phone       text,
  notified_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(product_id, email)
);

ALTER TABLE product_waitlist ENABLE ROW LEVEL SECURITY;

-- DROP before CREATE — Postgres has no CREATE POLICY IF NOT EXISTS
DROP POLICY IF EXISTS "Public can join waitlist"      ON product_waitlist;
DROP POLICY IF EXISTS "Service role manages waitlist" ON product_waitlist;

CREATE POLICY "Public can join waitlist"
  ON product_waitlist FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role manages waitlist"
  ON product_waitlist FOR ALL USING (auth.role() = 'service_role');
