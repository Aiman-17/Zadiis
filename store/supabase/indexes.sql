-- Performance indexes — run once in Supabase SQL editor.
-- Without these every homepage section, scoring query, and dashboard KPI is a full table scan.

-- Orders: time-range queries (revenue reports, scoring window, archive cron)
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at DESC);

-- Orders: status filter (scoring includes processing/shipped/delivered)
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(order_status);

-- Products: Best Sellers homepage section + merchandising panel
CREATE INDEX IF NOT EXISTS idx_products_bestseller
  ON products(best_seller_score DESC)
  WHERE is_active = true;

-- Products: Trending Now section
CREATE INDEX IF NOT EXISTS idx_products_trending
  ON products(trending_score DESC)
  WHERE is_active = true;

-- Products: Just Dropped section + archive cron
CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON products(created_at DESC)
  WHERE is_active = true;
