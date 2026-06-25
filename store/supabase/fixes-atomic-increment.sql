-- Atomic increment of total_sold — replaces the read-modify-write in scoring.ts
-- which loses increments when two orders arrive concurrently for the same product.
-- A single UPDATE statement in Postgres is always atomic.
CREATE OR REPLACE FUNCTION increment_total_sold(p_product_id uuid, p_quantity integer)
RETURNS void
LANGUAGE sql AS $$
  UPDATE products
  SET total_sold = COALESCE(total_sold, 0) + p_quantity
  WHERE id = p_product_id;
$$;
