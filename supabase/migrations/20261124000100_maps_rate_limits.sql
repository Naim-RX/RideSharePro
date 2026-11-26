-- Only the authenticated Edge proxy may consume this atomic, per-user budget.
create table private.maps_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('autocomplete', 'details', 'route')),
  window_start timestamptz not null,
  requests integer not null check (requests > 0),
  primary key (user_id, action)
);
alter table private.maps_rate_limits enable row level security;
revoke all on private.maps_rate_limits from public, anon, authenticated;

create function public.consume_maps_budget(p_user_id uuid, p_action text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer; maximum integer; bucket timestamptz := date_trunc('minute', clock_timestamp());
begin
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'customer' and account_status = 'active') then
    raise exception 'Active customer required' using errcode = '42501';
  end if;
  maximum := case p_action when 'autocomplete' then 30 when 'details' then 12 when 'route' then 6 else null end;
  if maximum is null then raise exception 'Invalid action' using errcode = '22023'; end if;
  insert into private.maps_rate_limits as budget values (p_user_id, p_action, bucket, 1)
  on conflict (user_id, action) do update set
    requests = case when budget.window_start = bucket then least(budget.requests + 1, maximum + 1) else 1 end,
    window_start = bucket
  returning requests into n;
  return n <= maximum;
end;
$$;
revoke all on function public.consume_maps_budget(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_maps_budget(uuid, text) to service_role;
