begin;
-- Google content stays transient. Store exempt place identifiers and user text;
-- legacy/manual coordinates remain supported by the existing checked RPC.
alter table public.rides
  add column location_source text not null default 'manual' check (location_source in ('manual','google_places')),
  add column pickup_place_id text check (char_length(pickup_place_id) between 1 and 255),
  add column destination_place_id text check (char_length(destination_place_id) between 1 and 255),
  add column routing_mode text check (routing_mode in ('TWO_WHEELER','DRIVE')),
  alter column pickup_latitude drop not null,
  alter column pickup_longitude drop not null,
  alter column destination_latitude drop not null,
  alter column destination_longitude drop not null,
  alter column distance_meters drop not null,
  alter column duration_seconds drop not null;
alter table public.rides add constraint ride_location_storage check (
  (location_source = 'manual' and pickup_latitude is not null and pickup_longitude is not null
    and destination_latitude is not null and destination_longitude is not null
    and distance_meters is not null and duration_seconds is not null)
  or (location_source = 'google_places' and pickup_place_id is not null and destination_place_id is not null
    and pickup_place_id <> destination_place_id and routing_mode is not null
    and pickup_latitude is null and pickup_longitude is null and destination_latitude is null
    and destination_longitude is null and distance_meters is null and duration_seconds is null)
);

create function public.post_customer_ride(
  p_request_key uuid, p_pickup_place_id text, p_destination_place_id text,
  p_pickup_label text, p_destination_label text, p_routing_mode text, p_expected_fare numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_role('customer'); existing public.rides; result uuid;
begin
  perform 1 from public.profiles where id = uid for update;
  select * into existing from public.rides where customer_id = uid and request_key = p_request_key;
  if found then
    if existing.location_source <> 'google_places'
      or existing.pickup_place_id is distinct from p_pickup_place_id
      or existing.destination_place_id is distinct from p_destination_place_id
      or existing.pickup_label is distinct from btrim(p_pickup_label)
      or existing.destination_label is distinct from btrim(p_destination_label)
      or existing.routing_mode is distinct from p_routing_mode
      or existing.expected_fare is distinct from p_expected_fare then
      raise exception 'Request key already used with different ride details' using errcode = '22023';
    end if;
    return existing.id;
  end if;
  if p_expected_fare is null or p_expected_fare <= 0 or p_expected_fare >= 1000000
    or p_expected_fare <> round(p_expected_fare, 2) then
    raise exception 'Fare must be positive BDT with at most two decimal places' using errcode = '22023';
  end if;
  if p_pickup_place_id !~ '^[A-Za-z0-9_-]{1,255}$' or p_destination_place_id !~ '^[A-Za-z0-9_-]{1,255}$' then
    raise exception 'Invalid place identifier' using errcode = '22023';
  end if;
  insert into public.rides(customer_id, request_key, location_source, pickup_place_id, destination_place_id,
    pickup_label, destination_label, routing_mode, expected_fare, status)
  values (uid, p_request_key, 'google_places', p_pickup_place_id, p_destination_place_id,
    btrim(p_pickup_label), btrim(p_destination_label), p_routing_mode, p_expected_fare, 'open') returning id into result;
  return result;
end;
$$;
revoke all on function public.post_customer_ride(uuid,text,text,text,text,text,numeric) from public, anon;
grant execute on function public.post_customer_ride(uuid,text,text,text,text,text,numeric) to authenticated;
commit;
