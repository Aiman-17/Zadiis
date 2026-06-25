-- Add exchange support columns to return_requests
ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'return'
    CHECK (request_type IN ('return', 'exchange')),
  ADD COLUMN IF NOT EXISTS exchange_details text,
  ADD COLUMN IF NOT EXISTS exchange_status text
    CHECK (exchange_status IN ('pending', 'shipped', 'delivered'));
