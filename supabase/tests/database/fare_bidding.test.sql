begin;
create function public.bid_ok(condition boolean,description text) returns text language plpgsql as $$
begin if condition is distinct from true then raise exception 'Assertion failed: %',description; end if;return 'ok - '||description;end $$;
create function public.bid_denied(statement text,description text) returns text language plpgsql as $$
declare state text;begin begin execute statement;exception when others then state:=sqlstate;end;
if state is distinct from '42501' then raise exception '%: expected 42501 got %',description,coalesce(state,'success');end if;return 'ok - '||description;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.bid_ok((select count(*)=2 from public.list_customer_bids('40000000-0000-4000-8000-000000000001')),'customer can compare bids on own ride');
select public.bid_ok((select bool_and(rating_count=0 and average_rating is null) from public.list_customer_bids('40000000-0000-4000-8000-000000000001')),'unrated bikers do not receive invented scores');
select public.bid_ok((select not(to_jsonb(b)?'mobile') and not(to_jsonb(b)?'email') and biker_name is not null from public.list_customer_bids('40000000-0000-4000-8000-000000000001') b limit 1),'comparison exposes names without private contact fields');
select public.bid_ok((select count(*)=1 from public.list_customer_bids('40000000-0000-4000-8000-000000000001',
 (select amount from public.list_customer_bids('40000000-0000-4000-8000-000000000001') limit 1),
 (select id from public.list_customer_bids('40000000-0000-4000-8000-000000000001') limit 1))),'fare cursor advances to the next offer');
select public.bid_ok((select count(*)=1 from public.ride_availability_events),'customer sees only own ride invalidation');
select public.bid_denied('select * from public.list_my_bids()','customer cannot read biker bid archive');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.bid_denied($q$select * from public.list_customer_bids('40000000-0000-4000-8000-000000000001')$q$,'another customer cannot read this comparison');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select public.bid_ok((select count(*)=1 from public.list_my_bids()),'biker archive contains only own offers');
select public.bid_denied($q$update public.bids set amount=1 where biker_id='20000000-0000-4000-8000-000000000002'$q$,'biker cannot modify a competitor offer');
select public.bid_denied($q$select * from public.list_customer_bids('40000000-0000-4000-8000-000000000001')$q$,'biker cannot read competing customer comparison');
reset role;
update public.bids set status='withdrawn' where ride_id='40000000-0000-4000-8000-000000000001' and biker_id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
  perform public.submit_bid('40000000-0000-4000-8000-000000000001',150);
  raise exception 'Non-pending bid was incorrectly editable';
exception when check_violation then null; end $$;
select 'ok - non-editable bid produces the constraint error handled by the bid-specific UI message';
select public.set_biker_availability(false);
select public.bid_ok((select count(*)=1 from public.list_my_bids()),'offline biker can still view own submitted status');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.transition_ride('40000000-0000-4000-8000-000000000001','cancelled');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select public.set_biker_availability(true);
select public.bid_denied($q$select public.submit_bid('40000000-0000-4000-8000-000000000001',100)$q$,'closed ride rejects subsequent bid creation or updates');
select public.bid_ok((select status='withdrawn' and ride_status='cancelled' from public.list_my_bids() limit 1),'ride closing leaves submitted bid withdrawn');
set local role anon;
select public.bid_denied('select * from public.list_my_bids()','anonymous bid archive denied');
select '1..15';
rollback;
