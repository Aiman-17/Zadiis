-- Admin notification center (spec 004-post-launch-roadmap, US1)
-- Surfaces payment-received / cancellation / return / exchange events
-- in-admin instead of requiring the merchant to check email.
create table if not exists admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('payment_received', 'cancellation_request', 'return_request', 'exchange_request')),
  order_id uuid references orders(id),
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz
);

create index if not exists admin_notifications_unread_idx on admin_notifications (created_at desc) where read_at is null;
create index if not exists admin_notifications_active_idx on admin_notifications (created_at desc) where archived_at is null;

alter table admin_notifications enable row level security;

-- Admin-only — no anon policy, matches store_settings and every other admin-only table.
create policy "admin_notifications_service_all" on admin_notifications
  for all to service_role using (true);
