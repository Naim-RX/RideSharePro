begin;

-- These helpers inspect the authenticated caller only. No arbitrary user ID input.
-- SECURITY DEFINER prevents recursive profiles policies; search_path is pinned.
create function private.current_app_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and account_status = 'active';
$$;

create function private.is_available_biker() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.current_app_role() = 'biker'
    and exists (select 1 from public.biker_profiles where id = (select auth.uid()) and is_online)
    and not exists (select 1 from public.rides where biker_id = (select auth.uid()) and status in ('assigned', 'in_progress'));
$$;

create function private.owns_ride(p_ride_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.current_app_role() = 'customer'
    and exists (select 1 from public.rides where id = p_ride_id and customer_id = (select auth.uid()));
$$;

create function private.require_role(p_role text default null) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_role text := private.current_app_role();
begin
  if auth.uid() is null or v_role is null or (p_role is not null and v_role <> p_role) then
    raise insufficient_privilege using message = 'An active account with the required role is needed.';
  end if;
  return auth.uid();
end;
$$;

create policy profiles_private_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.current_app_role()) = 'admin');
create policy bikers_private_read on public.biker_profiles for select to authenticated
using (id = (select auth.uid()) or (select private.current_app_role()) = 'admin');
create policy rides_permitted_read on public.rides for select to authenticated
using (
  (select private.current_app_role()) = 'admin'
  or ((select private.current_app_role()) = 'customer' and customer_id = (select auth.uid()))
  or ((select private.current_app_role()) = 'biker' and biker_id = (select auth.uid()))
  or (status = 'open' and (select private.is_available_biker()))
);
create policy bids_permitted_read on public.bids for select to authenticated
using (
  (select private.current_app_role()) = 'admin'
  or ((select private.current_app_role()) = 'biker' and biker_id = (select auth.uid()))
  or private.owns_ride(ride_id)
);
create policy ratings_permitted_read on public.ratings for select to authenticated
using (
  (select private.current_app_role()) = 'admin'
  or ((select private.current_app_role()) = 'customer' and customer_id = (select auth.uid()))
  or ((select private.current_app_role()) = 'biker' and biker_id = (select auth.uid()))
);
create policy complaints_private_read on public.complaints for select to authenticated
using ((select private.current_app_role()) = 'admin' or ((select private.current_app_role()) is not null and reporter_id = (select auth.uid())));
create policy audit_admin_read on public.admin_audit_logs for select to authenticated
using ((select private.current_app_role()) = 'admin');

-- No client INSERT/UPDATE/DELETE grants or policies: writes go through checked RPCs.
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.current_app_role(), private.is_available_biker(), private.owns_ride(uuid) to authenticated;

commit;
