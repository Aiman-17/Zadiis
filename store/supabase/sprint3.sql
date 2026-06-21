-- Sprint 3 Migration — run in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS safepay_tracker text,
  ADD COLUMN IF NOT EXISTS safepay_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages invoices" ON invoices
  FOR ALL USING (auth.role() = 'service_role');
