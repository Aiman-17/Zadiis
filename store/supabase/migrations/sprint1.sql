-- store/supabase/migrations/sprint1.sql

-- Delivery zones (cities + charges, managed from admin settings)
create table if not exists delivery_zones (
  id uuid default gen_random_uuid() primary key,
  city text not null unique,
  delivery_charge decimal(10,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Store settings (key/value: cod_enabled etc.)
create table if not exists store_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Add SKU to products
alter table products add column if not exists sku text unique;

-- Add order_number and delivery_charge to orders
alter table orders add column if not exists order_number text unique;
alter table orders add column if not exists delivery_charge decimal(10,2) not null default 0;

-- Seeds
insert into delivery_zones (city, delivery_charge)
  values ('Karachi', 200)
  on conflict (city) do nothing;

insert into store_settings (key, value)
  values ('cod_enabled', 'false')
  on conflict (key) do nothing;

-- RLS for new tables
alter table delivery_zones enable row level security;
alter table store_settings enable row level security;

create policy "delivery_zones_anon_select"
  on delivery_zones for select to anon using (is_active = true);
create policy "delivery_zones_service_all"
  on delivery_zones for all to service_role using (true);

create policy "store_settings_anon_select"
  on store_settings for select to anon using (true);
create policy "store_settings_service_all"
  on store_settings for all to service_role using (true);
