-- ─── Stock Movements Ledger ─────────────────────────────────────────────────
-- Records every stock change: sales, restocks, returns, manual adjustments.
-- Append-only — never update or delete rows.

CREATE TABLE IF NOT EXISTS stock_movements (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  uuid REFERENCES products(id) ON DELETE SET NULL,
  delta       integer NOT NULL,                -- negative = stock out, positive = stock in
  reason      text NOT NULL CHECK (reason IN ('sale', 'restock', 'return', 'adjustment')),
  order_id    uuid REFERENCES orders(id) ON DELETE SET NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order   ON stock_movements(order_id);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages stock movements" ON stock_movements;
CREATE POLICY "Service role manages stock movements"
  ON stock_movements FOR ALL USING (auth.role() = 'service_role');

-- ─── COD status column on orders ─────────────────────────────────────────────
-- Tracks whether the rider collected cash for COD orders.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_status text
  CHECK (cod_status IN ('pending', 'received', 'lost')) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason text;
