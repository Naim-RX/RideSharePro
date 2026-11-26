begin;
create function public.maps_assert(condition boolean, description text) returns text language plpgsql as $$
begin if condition is distinct from true then raise exception 'Assertion failed: %', description; end if; return 'ok - ' || description; end;
$$;
select public.maps_assert(not has_function_privilege('anon','public.consume_maps_budget(uuid,text)','EXECUTE'), 'anonymous callers cannot consume map budgets');
select public.maps_assert(not has_function_privilege('authenticated','public.consume_maps_budget(uuid,text)','EXECUTE'), 'clients cannot impersonate another user in the rate limiter');
select public.maps_assert(not has_table_privilege('authenticated','private.maps_rate_limits','SELECT'), 'rate limits are private');
select public.maps_assert((select relrowsecurity from pg_class where oid = 'private.maps_rate_limits'::regclass), 'rate limit table enables RLS');
select public.maps_assert(public.consume_maps_budget('10000000-0000-4000-8000-000000000001','route'), 'active customer receives first request');
select public.consume_maps_budget('10000000-0000-4000-8000-000000000001','route') from generate_series(1,5);
select public.maps_assert(not public.consume_maps_budget('10000000-0000-4000-8000-000000000001','route'), 'seventh route request is rejected');
update private.maps_rate_limits set window_start = now() - interval '2 minutes';
select public.maps_assert(public.consume_maps_budget('10000000-0000-4000-8000-000000000001','route'), 'budget resets in a new minute');
update public.biker_profiles set is_online=false where id='20000000-0000-4000-8000-000000000001';
do $$ begin
  perform public.consume_maps_budget('20000000-0000-4000-8000-000000000001','route');
  raise exception 'biker was allowed';
exception when insufficient_privilege then null; end $$;
select 'ok - offline biker map calls are rejected';
update public.profiles set account_status = 'suspended' where id = '10000000-0000-4000-8000-000000000001';
do $$ begin
  perform public.consume_maps_budget('10000000-0000-4000-8000-000000000001','route');
  raise exception 'suspended account was allowed';
exception when insufficient_privilege then null; end $$;
select 'ok - suspended map calls are rejected';
select '1..9';
rollback;
