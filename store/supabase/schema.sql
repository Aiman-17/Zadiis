-- Categories
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Products
create table products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  description text,
  price decimal(10,2) not null,
  category_id uuid references categories(id),
  images text[] default '{}',
  sizes text[] default '{}',
  colors text[] default '{}',
  stock_quantity integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Orders
create table orders (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address text not null,
  city text not null,
  items jsonb not null,
  subtotal decimal(10,2) not null,
  total decimal(10,2) not null,
  payment_method text not null check (payment_method in ('jazzcash', 'easypaisa', 'card', 'cod')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  order_status text default 'new' check (order_status in ('new', 'processing', 'shipped', 'delivered', 'returned')),
  created_at timestamptz default now()
);

-- Seed initial category
insert into categories (name, slug) values ('Women''s Clothing', 'womens-clothing');

-- Row Level Security
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;

-- Categories: readable by everyone
create policy "categories_select_anon" on categories for select to anon using (true);

-- Products: readable by everyone
create policy "products_select_anon" on products for select to anon using (true);

-- Orders: insertable by anon, readable only by service_role
create policy "orders_insert_anon" on orders for insert to anon with check (true);
create policy "orders_select_service_role" on orders for select to service_role using (true);

-- Sprint 2 Migration
-- Reviews table for product reviews (no login required)
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert reviews" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role manages reviews" ON reviews
  USING (auth.role() = 'service_role');

-- Sprint 2 RPC function for atomic stock decrement
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity integer)
RETURNS boolean AS $$
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
  END IF;

  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
