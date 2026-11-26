begin;
-- Existing UNIQUE(ride_id,biker_id), RLS and submit_bid are retained.
-- submit_bid and transition_ride both lock the ride first, serializing close/bid.
create function public.list_customer_bids(p_ride_id uuid,p_after_amount numeric default null,p_after_id uuid default null)
returns table(id uuid,amount numeric,status text,created_at timestamptz,biker_name text,motorcycle_model text,average_rating numeric,rating_count bigint)
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_role('customer');
begin
  if not exists(select 1 from public.rides owned where owned.id=p_ride_id and owned.customer_id=uid) then
    raise insufficient_privilege using message='Ride is not accessible'; end if;
  return query select b.id,b.amount,b.status,b.created_at,p.full_name,bp.motorcycle_model,
    (select round(avg(r.score),2) from public.ratings r where r.biker_id=b.biker_id),
    (select count(*) from public.ratings r where r.biker_id=b.biker_id)
  from public.bids b join public.profiles p on p.id=b.biker_id join public.biker_profiles bp on bp.id=b.biker_id
  where b.ride_id=p_ride_id and (p_after_amount is null or (b.amount,b.id)>(p_after_amount,p_after_id))
  order by b.amount,b.id limit 20;
end;
$$;
create function public.list_my_bids(p_before timestamptz default null,p_before_id uuid default null)
returns table(id uuid,ride_id uuid,amount numeric,status text,created_at timestamptz,pickup_label text,destination_label text,ride_status text)
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_role('biker');
begin
  return query select b.id,b.ride_id,b.amount,b.status,b.created_at,r.pickup_label,r.destination_label,r.status
  from public.bids b join public.rides r on r.id=b.ride_id
  where b.biker_id=uid and (p_before is null or (b.created_at,b.id)<(p_before,p_before_id))
  order by b.created_at desc,b.id desc limit 20;
end;
$$;
revoke all on function public.list_customer_bids(uuid,numeric,uuid),public.list_my_bids(timestamptz,uuid) from public,anon;
grant execute on function public.list_customer_bids(uuid,numeric,uuid),public.list_my_bids(timestamptz,uuid) to authenticated;
create policy customer_reads_own_ride_events on public.ride_availability_events for select to authenticated using (private.owns_ride(id));
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='bids') then
    alter publication supabase_realtime add table public.bids;
  end if;
end $$;
commit;
