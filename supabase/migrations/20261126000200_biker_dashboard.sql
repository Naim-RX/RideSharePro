begin;
-- Public ride rows contain transaction identifiers; discovery uses a projection.
drop policy rides_permitted_read on public.rides;
create policy rides_permitted_read on public.rides for select to authenticated using (
  (select private.current_app_role()) = 'admin'
  or ((select private.current_app_role()) = 'customer' and customer_id = (select auth.uid()))
  or ((select private.current_app_role()) = 'biker' and biker_id = (select auth.uid()))
);

create function public.list_biker_rides(p_history boolean default false, p_before timestamptz default null, p_before_id uuid default null)
returns table(id uuid, pickup_label text, destination_label text, distance_meters integer, duration_seconds integer,
  expected_fare numeric, status text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_role('biker');
begin
  if not p_history and not private.is_available_biker() then raise insufficient_privilege using message = 'Go online to browse rides'; end if;
  return query select r.id,r.pickup_label,r.destination_label,r.distance_meters,r.duration_seconds,r.expected_fare,r.status,r.created_at
  from public.rides r join public.profiles customer on customer.id = r.customer_id
  where ((p_history and r.biker_id = uid and r.status in ('completed','cancelled'))
    or (not p_history and r.status = 'open' and customer.account_status = 'active'))
    and (p_before is null or (r.created_at,r.id) < (p_before,p_before_id))
  order by r.created_at desc,r.id desc limit 20;
end;
$$;
create function public.get_biker_ride(p_ride_id uuid)
returns table(id uuid,pickup_label text,destination_label text,distance_meters integer,duration_seconds integer,
  expected_fare numeric,status text,created_at timestamptz,proposed_fare numeric,bid_status text)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_role('biker');
begin
  if not private.is_available_biker() then raise insufficient_privilege using message = 'Go online to view this ride'; end if;
  return query select r.id,r.pickup_label,r.destination_label,r.distance_meters,r.duration_seconds,r.expected_fare,r.status,r.created_at,b.amount,b.status
  from public.rides r join public.profiles customer on customer.id = r.customer_id
  left join public.bids b on b.ride_id = r.id and b.biker_id = uid
  where r.id = p_ride_id and r.status = 'open' and customer.account_status = 'active';
end;
$$;
create function public.get_biker_route_points(p_user_id uuid,p_ride_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ride public.rides;
begin
  if not exists(select 1 from public.profiles p join public.biker_profiles b on b.id=p.id
    where p.id=p_user_id and p.role='biker' and p.account_status='active' and b.is_online)
    or exists(select 1 from public.rides where biker_id=p_user_id and status in ('assigned','in_progress')) then
    raise insufficient_privilege using message = 'Active available biker required';
  end if;
  select r.* into ride from public.rides r join public.profiles p on p.id=r.customer_id
    where r.id=p_ride_id and r.status='open' and p.account_status='active';
  if not found then raise insufficient_privilege using message = 'Ride unavailable'; end if;
  if ride.location_source='google_places' then
    return jsonb_build_object('origin',jsonb_build_object('placeId',ride.pickup_place_id),'destination',jsonb_build_object('placeId',ride.destination_place_id));
  end if;
  return jsonb_build_object('origin',jsonb_build_object('latitude',ride.pickup_latitude,'longitude',ride.pickup_longitude),
    'destination',jsonb_build_object('latitude',ride.destination_latitude,'longitude',ride.destination_longitude));
end;
$$;
revoke all on function public.list_biker_rides(boolean,timestamptz,uuid),public.get_biker_ride(uuid) from public,anon;
grant execute on function public.list_biker_rides(boolean,timestamptz,uuid),public.get_biker_ride(uuid) to authenticated;
revoke all on function public.get_biker_route_points(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_biker_route_points(uuid,uuid) to service_role;

-- A separate, small publication avoids replicating private ride columns.
create table public.ride_availability_events (
  id uuid primary key references public.rides(id) on delete cascade,
  is_open boolean not null,
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.ride_availability_events enable row level security;
revoke all on public.ride_availability_events from public,anon,authenticated;
grant select on public.ride_availability_events to authenticated;
create policy available_bikers_read_events on public.ride_availability_events for select to authenticated using ((select private.is_available_biker()));
create function private.signal_ride_availability() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.ride_availability_events(id,is_open) values(new.id,new.status='open')
  on conflict(id) do update set is_open=excluded.is_open,updated_at=clock_timestamp();
  return new;
end;
$$;
revoke all on function private.signal_ride_availability() from public,anon,authenticated;
create trigger signal_ride_availability after insert or update on public.rides for each row execute function private.signal_ride_availability();
create function private.signal_customer_availability() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.role='customer' then
    update public.ride_availability_events e set is_open=(new.account_status='active' and r.status='open'),updated_at=clock_timestamp()
    from public.rides r where r.id=e.id and r.customer_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.signal_customer_availability() from public,anon,authenticated;
create trigger signal_customer_availability after update of account_status on public.profiles for each row execute function private.signal_customer_availability();
insert into public.ride_availability_events(id,is_open) select id,status='open' from public.rides;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.ride_availability_events;
    -- Only the caller's rows are visible through their existing private policies.
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='biker_profiles') then
      alter publication supabase_realtime add table public.biker_profiles;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='profiles') then
      alter publication supabase_realtime add table public.profiles;
    end if;
  end if;
end $$;

create or replace function public.consume_maps_budget(p_user_id uuid,p_action text)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; maximum integer; bucket timestamptz:=date_trunc('minute',clock_timestamp());
begin
  if not exists(select 1 from public.profiles where id=p_user_id and account_status='active'
    and (role='customer' or (role='biker' and p_action='route'
      and exists(select 1 from public.biker_profiles where id=p_user_id and is_online)
      and not exists(select 1 from public.rides where biker_id=p_user_id and status in ('assigned','in_progress'))))) then
    raise insufficient_privilege using message='Active authorized account required';
  end if;
  maximum:=case p_action when 'autocomplete' then 30 when 'details' then 12 when 'route' then 6 else null end;
  if maximum is null then raise exception 'Invalid action' using errcode='22023'; end if;
  insert into private.maps_rate_limits as budget values(p_user_id,p_action,bucket,1)
  on conflict(user_id,action) do update set requests=case when budget.window_start=bucket then least(budget.requests+1,maximum+1) else 1 end,window_start=bucket
  returning requests into n;
  return n<=maximum;
end;
$$;
-- Keep the existing unique pending bid behavior, rejecting precision before rounding.
create or replace function public.submit_bid(p_ride_id uuid,p_amount numeric)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_role('biker'); ride public.rides; result uuid;
begin
  select * into ride from public.rides where id=p_ride_id for update;
  perform 1 from public.profiles where id=uid for update;
  if not found or ride.id is null or ride.status<>'open' or not private.is_available_biker()
    or not exists(select 1 from public.profiles where id=ride.customer_id and account_status='active') then
    raise insufficient_privilege using message='This ride is not available for bidding';
  end if;
  if p_amount is null or p_amount<=0 or p_amount>=1000000 or p_amount<>round(p_amount,2) then
    raise exception 'Invalid proposed fare' using errcode='22023'; end if;
  insert into public.bids(ride_id,biker_id,amount) values(p_ride_id,uid,p_amount)
  on conflict(ride_id,biker_id) do update set amount=excluded.amount where public.bids.status='pending' returning id into result;
  if result is null then raise check_violation using message='This bid can no longer be changed'; end if;
  return result;
end;
$$;
commit;
