begin;

create function public.update_my_profile(p_full_name text, p_mobile text, p_gender text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role(); v_result public.profiles;
begin
  update public.profiles set full_name = btrim(p_full_name),
    mobile = nullif(regexp_replace(coalesce(p_mobile, ''), '[\s()\-]', '', 'g'), ''), gender = p_gender
  where id = v_uid returning * into v_result;
  return v_result;
end;
$$;

create function public.update_my_motorcycle(p_model text, p_plate text)
returns public.biker_profiles language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('biker'); v_result public.biker_profiles;
begin
  update public.biker_profiles set motorcycle_model = btrim(p_model), plate_number = upper(btrim(p_plate))
  where id = v_uid returning * into v_result;
  return v_result;
end;
$$;

create function public.set_biker_availability(p_online boolean)
returns public.biker_profiles language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('biker'); v_result public.biker_profiles;
begin
  perform 1 from public.profiles where id = v_uid for update;
  if p_online and exists (select 1 from public.rides where biker_id = v_uid and status in ('assigned', 'in_progress')) then
    raise check_violation using message = 'An assigned biker cannot become available for another ride.';
  end if;
  update public.biker_profiles set is_online = p_online where id = v_uid returning * into v_result;
  return v_result;
end;
$$;

create function public.post_ride(
  p_request_key uuid, p_pickup_label text, p_destination_label text,
  p_pickup_latitude numeric, p_pickup_longitude numeric,
  p_destination_latitude numeric, p_destination_longitude numeric,
  p_distance_meters integer, p_duration_seconds integer, p_expected_fare numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('customer'); v_id uuid;
begin
  perform 1 from public.profiles where id = v_uid for update;
  select id into v_id from public.rides where customer_id = v_uid and request_key = p_request_key;
  if found then return v_id; end if;
  insert into public.rides(customer_id, request_key, pickup_label, destination_label,
    pickup_latitude, pickup_longitude, destination_latitude, destination_longitude,
    distance_meters, duration_seconds, expected_fare)
  values (v_uid, p_request_key, btrim(p_pickup_label), btrim(p_destination_label),
    p_pickup_latitude, p_pickup_longitude, p_destination_latitude, p_destination_longitude,
    p_distance_meters, p_duration_seconds, p_expected_fare)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.submit_bid(p_ride_id uuid, p_amount numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('biker'); v_ride public.rides; v_id uuid;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or v_ride.status <> 'open' or not private.is_available_biker() then
    raise insufficient_privilege using message = 'This ride is not available for bidding.';
  end if;
  if not exists (select 1 from public.profiles where id = v_ride.customer_id and account_status = 'active') then
    raise insufficient_privilege using message = 'This ride is not available for bidding.';
  end if;
  insert into public.bids(ride_id, biker_id, amount) values (p_ride_id, v_uid, p_amount)
  on conflict (ride_id, biker_id) do update set amount = excluded.amount
    where public.bids.status = 'pending'
  returning id into v_id;
  if v_id is null then raise check_violation using message = 'This bid can no longer be changed.'; end if;
  return v_id;
end;
$$;

create function public.accept_bid(p_bid_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('customer'); v_ride public.rides; v_bid public.bids; v_ride_id uuid;
begin
  -- First locate only a bid owned by this customer; unauthorized IDs are indistinguishable.
  select b.ride_id into v_ride_id from public.bids b join public.rides r on r.id = b.ride_id
  where b.id = p_bid_id and r.customer_id = v_uid;
  if not found then raise insufficient_privilege using message = 'Bid is not selectable.'; end if;
  -- Lock order is ride -> bid -> biker profile. All competing selections serialize.
  select * into v_ride from public.rides where id = v_ride_id for update;
  select * into v_bid from public.bids where id = p_bid_id for update;
  if v_ride.status = 'assigned' and v_ride.accepted_bid_id = p_bid_id then return v_ride.id; end if;
  if v_ride.status <> 'open' or v_bid.status <> 'pending' then
    raise check_violation using message = 'The ride or bid is no longer open.';
  end if;
  perform 1 from public.profiles where id = v_bid.biker_id and role = 'biker' and account_status = 'active' for update;
  if not found then raise check_violation using message = 'Biker is unavailable.'; end if;
  if not exists (select 1 from public.biker_profiles where id = v_bid.biker_id and is_online)
    or exists (select 1 from public.rides where biker_id = v_bid.biker_id and status in ('assigned', 'in_progress')) then
    raise check_violation using message = 'Biker is unavailable.';
  end if;
  update public.bids set status = case when id = p_bid_id then 'accepted' else 'rejected' end
  where ride_id = v_ride.id and status = 'pending';
  update public.rides set status = 'assigned', biker_id = v_bid.biker_id,
    accepted_bid_id = v_bid.id, agreed_fare = v_bid.amount, assigned_at = now()
  where id = v_ride.id;
  update public.biker_profiles set is_online = false where id = v_bid.biker_id;
  return v_ride.id;
end;
$$;

create function public.transition_ride(p_ride_id uuid, p_status text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role(); v_role text := private.current_app_role(); v_ride public.rides;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or not (v_ride.customer_id = v_uid or v_ride.biker_id = v_uid or v_role = 'admin') then
    raise insufficient_privilege using message = 'Ride operation is not permitted.';
  end if;
  if p_status = 'in_progress' and v_role = 'biker' and v_ride.biker_id = v_uid and v_ride.status = 'assigned' then
    update public.rides set status = 'in_progress', started_at = now() where id = p_ride_id;
  elsif p_status = 'completed' and v_role = 'biker' and v_ride.biker_id = v_uid and v_ride.status = 'in_progress' then
    update public.rides set status = 'completed', completed_at = now() where id = p_ride_id;
  elsif p_status = 'cancelled' and (
    (v_role = 'customer' and v_ride.customer_id = v_uid and v_ride.status in ('open', 'assigned'))
    or (v_role = 'admin' and v_ride.status in ('open', 'assigned', 'in_progress'))
  ) then
    update public.rides set status = 'cancelled', cancelled_at = now() where id = p_ride_id;
    update public.bids set status = 'withdrawn' where ride_id = p_ride_id and status = 'pending';
    if v_role = 'admin' then
      insert into public.admin_audit_logs(admin_id, action, target_id, details)
      values (v_uid, 'ride_cancelled', p_ride_id, jsonb_build_object('previous_status', v_ride.status));
    end if;
  else raise check_violation using message = 'Invalid ride status transition.';
  end if;
  return p_ride_id;
end;
$$;

create function public.rate_ride(p_ride_id uuid, p_score integer, p_feedback text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('customer'); v_ride public.rides; v_id uuid;
begin
  select * into v_ride from public.rides where id = p_ride_id and customer_id = v_uid for update;
  if not found then raise insufficient_privilege using message = 'Ride cannot be rated.'; end if;
  if v_ride.status <> 'completed' then raise check_violation using message = 'Only completed rides can be rated.'; end if;
  insert into public.ratings(ride_id, customer_id, biker_id, score, feedback)
  values (p_ride_id, v_uid, v_ride.biker_id, p_score, nullif(btrim(p_feedback), '')) returning id into v_id;
  return v_id;
end;
$$;

create function public.submit_complaint(p_subject text, p_description text, p_ride_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role(); v_id uuid;
begin
  if p_ride_id is not null and not exists (select 1 from public.rides where id = p_ride_id and (customer_id = v_uid or biker_id = v_uid)) then
    raise insufficient_privilege using message = 'Complaint must concern your own ride.';
  end if;
  insert into public.complaints(reporter_id, ride_id, subject, description)
  values (v_uid, p_ride_id, btrim(p_subject), btrim(p_description)) returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_set_account_status(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('admin'); v_old text;
begin
  select account_status into v_old from public.profiles where id = p_user_id and role <> 'admin' for update;
  if not found then raise insufficient_privilege using message = 'Only customer and biker accounts can be managed here.'; end if;
  update public.profiles set account_status = p_status where id = p_user_id;
  if p_status = 'suspended' then update public.biker_profiles set is_online = false where id = p_user_id; end if;
  insert into public.admin_audit_logs(admin_id, action, target_id, details)
  values (v_uid, 'account_status_changed', p_user_id, jsonb_build_object('from', v_old, 'to', p_status));
end;
$$;

create function public.admin_review_complaint(p_complaint_id uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('admin');
begin
  update public.complaints set status = p_status, resolution_note = nullif(btrim(p_note), ''), handled_by = v_uid,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end
  where id = p_complaint_id;
  if not found then raise no_data_found using message = 'Complaint not found.'; end if;
  insert into public.admin_audit_logs(admin_id, action, target_id, details)
  values (v_uid, 'complaint_reviewed', p_complaint_id, jsonb_build_object('status', p_status));
end;
$$;

-- Customers see only display fields of actual bidders on their own ride, never mobile/gender/status.
create function public.get_bidder_summaries(p_ride_id uuid)
returns table (biker_id uuid, full_name text, motorcycle_model text, average_rating numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.require_role('customer');
begin
  if not exists (select 1 from public.rides where id = p_ride_id and customer_id = v_uid) then
    raise insufficient_privilege using message = 'Ride is not accessible.';
  end if;
  return query
    select p.id, p.full_name, bp.motorcycle_model, (select round(avg(r.score), 2) from public.ratings r where r.biker_id = p.id)
    from public.bids b join public.profiles p on p.id = b.biker_id join public.biker_profiles bp on bp.id = p.id
    where b.ride_id = p_ride_id;
end;
$$;

-- Deliberately public, nonsensitive connectivity probe; never returns user data.
create function public.backend_health() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('application', 'RideShare Pro', 'schema_version', '20261120000300', 'database_time', now());
$$;

revoke execute on function public.update_my_profile(text,text,text), public.update_my_motorcycle(text,text),
  public.set_biker_availability(boolean), public.post_ride(uuid,text,text,numeric,numeric,numeric,numeric,integer,integer,numeric),
  public.submit_bid(uuid,numeric), public.accept_bid(uuid), public.transition_ride(uuid,text), public.rate_ride(uuid,integer,text),
  public.submit_complaint(text,text,uuid), public.admin_set_account_status(uuid,text), public.admin_review_complaint(uuid,text,text),
  public.get_bidder_summaries(uuid), public.backend_health() from public, anon, authenticated;
grant execute on function public.update_my_profile(text,text,text), public.update_my_motorcycle(text,text),
  public.set_biker_availability(boolean), public.post_ride(uuid,text,text,numeric,numeric,numeric,numeric,integer,integer,numeric),
  public.submit_bid(uuid,numeric), public.accept_bid(uuid), public.transition_ride(uuid,text), public.rate_ride(uuid,integer,text),
  public.submit_complaint(text,text,uuid), public.admin_set_account_status(uuid,text), public.admin_review_complaint(uuid,text,text),
  public.get_bidder_summaries(uuid) to authenticated;
grant execute on function public.backend_health() to anon, authenticated;

commit;
