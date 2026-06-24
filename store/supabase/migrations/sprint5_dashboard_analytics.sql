-- Sprint 5: Dashboard & Analytics Rebuild
-- Run in Supabase SQL Editor

-- 1. Add 'cancelled' to order_status enum
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'new', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'
  ));

-- 2. Add cancellation reason (nullable — only set when cancelled)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text
  CHECK (cancellation_reason IN (
    'customer_changed_mind', 'no_response', 'wrong_address',
    'duplicate_order', 'out_of_stock', 'delivery_delay', 'other'
  ));

-- 3. Add archive flag (default false — all existing orders stay visible)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
