-- Free delivery + cancellation toggles (spec 006, US3/US4)
-- Both default 'true' — preserves today's always-on behavior until a
-- merchant explicitly disables one. The admin UI also treats a MISSING row
-- as enabled (see admin/settings/page.tsx), so this seed is a convenience,
-- not a correctness requirement.
insert into store_settings (key, value) values ('free_delivery_enabled', 'true') on conflict (key) do nothing;
insert into store_settings (key, value) values ('cancellations_enabled', 'true') on conflict (key) do nothing;
