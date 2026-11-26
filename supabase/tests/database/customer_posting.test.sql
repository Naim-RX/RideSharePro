begin;
create function public.posting_ok(condition boolean, description text) returns text language plpgsql as $$
begin if condition is distinct from true then raise exception 'Assertion failed: %', description; end if; return 'ok - ' || description; end;
$$;
create function public.posting_throws(statement text, expected text, description text) returns text language plpgsql as $$
declare actual text;
begin begin execute statement; exception when others then actual := sqlstate; end;
if actual is distinct from expected then raise exception '%: expected %, got %', description, expected, coalesce(actual,'success'); end if;
return 'ok - ' || description; end;
$$;
-- Free this fixture's active slot; the whole test rolls back.
update public.rides set status = 'cancelled', cancelled_at = now() where customer_id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('test.posted_ride', public.post_customer_ride('60000000-0000-4000-8000-000000000001','place-a','place-b','Campus gate','Library','TWO_WHEELER',125.50)::text, true);
select public.posting_ok((select status = 'open' and customer_id = auth.uid() from public.rides where id = current_setting('test.posted_ride')::uuid), 'posting derives owner from authenticated identity and starts open');
select public.posting_ok((select pickup_place_id = 'place-a' and destination_place_id = 'place-b' and pickup_latitude is null and distance_meters is null and duration_seconds is null from public.rides where id = current_setting('test.posted_ride')::uuid), 'Google rides retain place IDs without coordinates or route estimates');
select public.posting_ok((select count(distinct public.post_customer_ride('60000000-0000-4000-8000-000000000001','place-a','place-b','Campus gate','Library','TWO_WHEELER',125.50)) = 1 from generate_series(1,3)), 'duplicate requests return one ride');
select public.posting_throws($q$select public.post_customer_ride('60000000-0000-4000-8000-000000000001','place-a','place-b','Campus gate','Library','TWO_WHEELER',130)$q$,'22023','same key with changed payload is rejected');
select public.posting_throws($q$select public.post_customer_ride(gen_random_uuid(),'place-a','place-b','Campus gate','Library','TWO_WHEELER',0)$q$,'22023','zero fare is rejected');
select public.posting_throws($q$select public.post_customer_ride(gen_random_uuid(),'place-a','place-b','Campus gate','Library','TWO_WHEELER',1.234)$q$,'22023','excess fare precision is rejected before numeric rounding');
select public.posting_throws($q$select public.post_customer_ride(gen_random_uuid(),null,'place-b','Campus gate','Library','TWO_WHEELER',125)$q$,'23514','missing location is rejected');
select public.posting_throws($q$select public.post_customer_ride(gen_random_uuid(),'place-a','place-a','Campus gate','Library','TWO_WHEELER',125)$q$,'23514','identical place IDs are rejected');
select public.posting_throws($q$select public.post_customer_ride(gen_random_uuid(),'place-a','place-b','Campus gate','Library','TWO_WHEELER',125)$q$,'23505','a different key cannot create a second active ride');
select public.posting_throws($q$update public.rides set customer_id = '10000000-0000-4000-8000-000000000002' where id = current_setting('test.posted_ride')::uuid$q$,'42501','customer cannot forge ride ownership');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.posting_ok((select count(*) = 0 from public.rides where id = current_setting('test.posted_ride')::uuid),'another customer cannot read the posted ride');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select public.posting_throws($q$select public.post_customer_ride(gen_random_uuid(),'place-a','place-b','Campus gate','Library','DRIVE',125)$q$,'42501','biker cannot post a customer ride');
reset role;
update public.profiles set account_status = 'suspended' where id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.posting_throws($q$select public.post_customer_ride('60000000-0000-4000-8000-000000000001','place-a','place-b','Campus gate','Library','TWO_WHEELER',125.50)$q$,'42501','suspended customer cannot post or replay');
set local role anon;
select public.posting_throws($q$select public.post_customer_ride(gen_random_uuid(),'place-a','place-b','Campus gate','Library','DRIVE',125)$q$,'42501','anonymous posting is denied');
select '1..14';
rollback;
