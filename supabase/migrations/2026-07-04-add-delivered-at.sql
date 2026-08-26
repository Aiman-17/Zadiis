-- Add delivered_at timestamp (cancel/return/exchange policy enforcement).
-- Mirrors the existing cancelled_at / returned_at pattern — stamped by the
-- admin order-status PUT handler whenever order_status becomes 'delivered'.
-- Orders already marked delivered before this migration will have a null
-- delivered_at; the return/exchange policy check falls back to the old
-- 7-day-from-order-date rule for those specific orders.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
