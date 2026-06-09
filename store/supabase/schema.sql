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
