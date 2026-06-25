-- Customer-submitted cancellation requests (shown in admin Cancellations tab)
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL,
  customer_email text NOT NULL,
  customer_name text,
  reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Customer-submitted return requests (shown in admin Returns tab)
CREATE TABLE IF NOT EXISTS return_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL,
  customer_email text NOT NULL,
  customer_name text,
  reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON cancellation_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role only" ON return_requests FOR ALL USING (auth.role() = 'service_role');

-- Indexes for the 90-day cleanup cron
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_created_at ON cancellation_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_return_requests_created_at ON return_requests (created_at);
