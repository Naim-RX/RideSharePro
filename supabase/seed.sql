-- DEVELOPMENT ONLY. This file is disabled in config.toml by default.
-- Explicitly enable only for a throwaway local database. Never push with --include-seed.
-- The synthetic users have no password/identity credentials and cannot be used to sign in.
insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'customer.one@example.invalid', '{"provider":"email","providers":["email"]}', '{"full_name":"Development Customer One","role":"customer","gender":"undisclosed","mobile":"01700000001"}', now(), now()),
 ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'customer.two@example.invalid', '{"provider":"email","providers":["email"]}', '{"full_name":"Development Customer Two","role":"customer"}', now(), now()),
 ('20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'biker.one@example.invalid', '{"provider":"email","providers":["email"]}', '{"full_name":"Development Biker One","role":"biker"}', now(), now()),
 ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'biker.two@example.invalid', '{"provider":"email","providers":["email"]}', '{"full_name":"Development Biker Two","role":"biker"}', now(), now()),
 ('30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@example.invalid', '{"provider":"email","providers":["email"]}', '{"full_name":"Development Administrator","role":"customer"}', now(), now())
on conflict (id) do nothing;

-- This is a trusted seed operation, not public signup/admin provisioning.
update public.profiles set role = 'admin' where id = '30000000-0000-4000-8000-000000000001';
update public.biker_profiles set motorcycle_model = 'Development Motorcycle', plate_number = 'DEV-ONE', is_online = true
where id = '20000000-0000-4000-8000-000000000001';
update public.biker_profiles set motorcycle_model = 'Development Motorcycle', plate_number = 'DEV-TWO', is_online = true
where id = '20000000-0000-4000-8000-000000000002';

insert into public.rides(id, customer_id, request_key, pickup_label, destination_label,
 pickup_latitude, pickup_longitude, destination_latitude, destination_longitude, distance_meters, duration_seconds, expected_fare)
values
 ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Development Campus Gate', 'Development Library', 23.7500000, 90.3900000, 23.7600000, 90.4000000, 2100, 600, 100.00),
 ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'Development Science Building', 'Development Student Hall', 23.7700000, 90.4100000, 23.7800000, 90.4200000, 3200, 900, 150.00)
on conflict (id) do nothing;

insert into public.bids(id, ride_id, biker_id, amount)
values
 ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 110.00),
 ('60000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 105.00)
on conflict (id) do nothing;

insert into public.complaints(id, reporter_id, ride_id, subject, description)
values ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Development example', 'Synthetic development complaint for testing access rules.')
on conflict (id) do nothing;
