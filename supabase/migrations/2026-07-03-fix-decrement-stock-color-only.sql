-- Fix BUG-003: variant_stock[color] never decrements for products that
-- track color but not size.
--
-- specs/001-e2e-test-suite/bugs/BUG-003-color-only-variant-stock-never-decrements.md
--
-- The original guard (supabase/migrations/sprint4_combined.sql) required
-- BOTH p_color and p_size to be non-sentinel ("_") before attempting a
-- variant_stock decrement. But "_" is also the legitimate stored key for
-- "this dimension isn't tracked" (e.g. variant_stock = {"Pista peach": {"_": 7}}
-- for a color-only product) — so the app always sends p_size = '_' for such
-- products, and the guard could never pass. Replaced the sentinel comparison
-- with an existence check on the color key itself, so a variant decrement is
-- attempted whenever the product actually tracks that color, regardless of
-- whether size is also tracked.

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

  -- Only update variant_stock if this product actually tracks the given
  -- color (regardless of whether size is also tracked — "_" is a valid
  -- size key meaning "no size dimension", not "skip variant tracking").
  IF v_current IS NOT NULL AND v_current ? p_color THEN
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

  -- Fallback: just decrement total (no variant tracking for this color,
  -- or variant quantity already exhausted)
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;
END;
$$;
