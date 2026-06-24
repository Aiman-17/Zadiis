-- ============================================================
-- Sprint 4 Combined Migration
-- Run in Supabase SQL editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- 1. Products: variant stock JSONB + bestseller flag
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variant_stock jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false;

-- 2. Orders: sale flag
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_sale boolean NOT NULL DEFAULT false;

-- 3. Sales table
CREATE TABLE IF NOT EXISTS sales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT false,
  delivery_charge_override integer,        -- NULL = keep zone charge; set to override flat rate
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Only one active sale at a time
CREATE UNIQUE INDEX IF NOT EXISTS sales_one_active
  ON sales (is_active)
  WHERE is_active = true;

-- 4. Sale products join
CREATE TABLE IF NOT EXISTS sale_products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id    uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_price integer NOT NULL,             -- PKR, overrides product.price during sale
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, product_id)
);

-- 5. Updated decrement_stock RPC
-- Adds optional p_color and p_size params.
-- If both are provided and variant_stock has data, decrements variant_stock[p_color][p_size].
-- Always decrements stock_quantity by p_quantity.
CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id uuid,
  p_quantity    integer,
  p_color       text DEFAULT '_',
  p_size        text DEFAULT '_'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current jsonb;
  v_qty     integer;
BEGIN
  SELECT variant_stock INTO v_current
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  -- Only update variant_stock if it has data and valid keys passed
  IF v_current IS NOT NULL AND v_current <> '{}'::jsonb
     AND p_color <> '_' AND p_size <> '_' THEN
    v_qty := COALESCE((v_current -> p_color -> p_size)::integer, 0);
    IF v_qty >= p_quantity THEN
      UPDATE products
      SET variant_stock = jsonb_set(
            v_current,
            ARRAY[p_color, p_size],
            to_jsonb(v_qty - p_quantity)
          ),
          stock_quantity = GREATEST(0, stock_quantity - p_quantity)
      WHERE id = p_product_id;
      RETURN;
    END IF;
  END IF;

  -- Fallback: just decrement total
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;
END;
$$;
