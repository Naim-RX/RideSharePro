begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  mobile text check (mobile ~ '^\+?[0-9]{10,15}$'),
  gender text check (gender in ('female', 'male', 'other', 'undisclosed')),
  role text not null default 'customer' check (role in ('customer', 'biker', 'admin')),
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.biker_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  motorcycle_model text check (char_length(btrim(motorcycle_model)) between 2 and 80),
  plate_number text unique check (char_length(btrim(plate_number)) between 3 and 40),
  is_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_biker_has_vehicle check (not is_online or (motorcycle_model is not null and plate_number is not null))
);

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  request_key uuid not null,
  pickup_label text not null check (char_length(btrim(pickup_label)) between 2 and 200),
  destination_label text not null check (char_length(btrim(destination_label)) between 2 and 200),
  pickup_latitude numeric(10,7) not null check (pickup_latitude between -90 and 90),
  pickup_longitude numeric(10,7) not null check (pickup_longitude between -180 and 180),
  destination_latitude numeric(10,7) not null check (destination_latitude between -90 and 90),
  destination_longitude numeric(10,7) not null check (destination_longitude between -180 and 180),
  distance_meters integer not null check (distance_meters between 1 and 1000000),
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  expected_fare numeric(10,2) not null check (expected_fare > 0 and expected_fare < 1000000),
  agreed_fare numeric(10,2) check (agreed_fare > 0 and agreed_fare < 1000000),
  status text not null default 'open' check (status in ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  biker_id uuid references public.biker_profiles(id) on delete restrict,
  accepted_bid_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  unique (customer_id, request_key),
  unique (id, customer_id, biker_id),
  constraint different_locations check (pickup_latitude <> destination_latitude or pickup_longitude <> destination_longitude),
  constraint complete_assignment check (
    (biker_id is null and accepted_bid_id is null and agreed_fare is null and assigned_at is null)
    or (biker_id is not null and accepted_bid_id is not null and agreed_fare is not null and assigned_at is not null)
  ),
  constraint status_requires_assignment check (status not in ('assigned', 'in_progress', 'completed') or biker_id is not null),
  constraint open_ride_unassigned check (status <> 'open' or biker_id is null),
  constraint started_ride_timestamp check (status not in ('in_progress', 'completed') or started_at is not null),
  constraint completed_ride_timestamp check ((status = 'completed') = (completed_at is not null)),
  constraint cancelled_ride_timestamp check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint ride_time_order check (
    (assigned_at is null or assigned_at >= created_at)
    and (started_at is null or (assigned_at is not null and started_at >= assigned_at))
    and (completed_at is null or completed_at >= started_at)
    and (cancelled_at is null or cancelled_at >= created_at)
  )
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete restrict,
  biker_id uuid not null references public.biker_profiles(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0 and amount < 1000000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ride_id, biker_id),
  unique (id, ride_id, biker_id, amount)
);

-- This composite FK prevents choosing a bid from another ride/biker or changing its fare.
alter table public.rides add constraint accepted_bid_matches_assignment
  foreign key (accepted_bid_id, id, biker_id, agreed_fare)
  references public.bids(id, ride_id, biker_id, amount)
  on delete restrict deferrable initially deferred;

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  biker_id uuid not null references public.biker_profiles(id) on delete restrict,
  score smallint not null check (score between 1 and 5),
  feedback text check (char_length(feedback) <= 1000),
  created_at timestamptz not null default now(),
  constraint rating_participants_match_ride foreign key (ride_id, customer_id, biker_id)
    references public.rides(id, customer_id, biker_id) on delete restrict
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  ride_id uuid references public.rides(id) on delete restrict,
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text check (char_length(btrim(resolution_note)) between 3 and 2000),
  handled_by uuid references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_resolution_complete check (
    (status in ('open', 'reviewing') and resolved_at is null)
    or (status in ('resolved', 'dismissed') and resolved_at is not null and resolution_note is not null and handled_by is not null)
  )
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('account_status_changed', 'complaint_reviewed', 'ride_cancelled')),
  target_id uuid not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create unique index one_active_ride_per_customer on public.rides(customer_id) where status in ('open', 'assigned', 'in_progress');
create unique index one_active_ride_per_biker on public.rides(biker_id) where status in ('assigned', 'in_progress');
create unique index one_accepted_bid_per_ride on public.bids(ride_id) where status = 'accepted';
create index profiles_role_status_idx on public.profiles(role, account_status);
create index biker_profiles_online_idx on public.biker_profiles(id) where is_online;
create index rides_customer_created_idx on public.rides(customer_id, created_at desc);
create index rides_biker_created_idx on public.rides(biker_id, created_at desc) where biker_id is not null;
create index rides_status_created_idx on public.rides(status, created_at desc);
create index bids_ride_status_amount_idx on public.bids(ride_id, status, amount);
create index bids_biker_created_idx on public.bids(biker_id, created_at desc);
create index ratings_biker_created_idx on public.ratings(biker_id, created_at desc);
create index ratings_customer_idx on public.ratings(customer_id);
create index complaints_reporter_created_idx on public.complaints(reporter_id, created_at desc);
create index complaints_status_created_idx on public.complaints(status, created_at desc);
create index complaints_ride_idx on public.complaints(ride_id) where ride_id is not null;
create index complaints_handler_idx on public.complaints(handled_by) where handled_by is not null;
create index admin_audit_admin_created_idx on public.admin_audit_logs(admin_id, created_at desc);
create index admin_audit_target_idx on public.admin_audit_logs(target_id);

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create function private.validate_relationships() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_ride public.rides;
begin
  if tg_table_name = 'biker_profiles' then
    if not exists (select 1 from public.profiles where id = new.id and role = 'biker') then
      raise check_violation using message = 'Biker profile requires a biker account.';
    end if;
  elsif tg_table_name = 'rides' then
    if not exists (select 1 from public.profiles where id = new.customer_id and role = 'customer') then
      raise check_violation using message = 'Ride owner must be a customer.';
    end if;
  elsif tg_table_name = 'ratings' then
    select * into v_ride from public.rides where id = new.ride_id;
    if not found then raise foreign_key_violation using message = 'Unknown ride.'; end if;
    if v_ride.status <> 'completed' or v_ride.customer_id <> new.customer_id or v_ride.biker_id is distinct from new.biker_id then
      raise check_violation using message = 'Rating must match a completed ride and its participants.';
    end if;
  elsif tg_table_name = 'complaints' then
    if new.ride_id is not null and not exists (
      select 1 from public.rides where id = new.ride_id and (customer_id = new.reporter_id or biker_id = new.reporter_id)
    ) then raise check_violation using message = 'Reporter must be a ride participant.'; end if;
    if new.handled_by is not null and not exists (select 1 from public.profiles where id = new.handled_by and role = 'admin') then
      raise check_violation using message = 'Complaint handler must be an administrator.';
    end if;
  end if;
  return new;
end;
$$;

create trigger biker_relationship before insert or update on public.biker_profiles for each row execute function private.validate_relationships();
create trigger ride_relationship before insert or update on public.rides for each row execute function private.validate_relationships();
create trigger rating_relationship before insert or update on public.ratings for each row execute function private.validate_relationships();
create trigger complaint_relationship before insert or update on public.complaints for each row execute function private.validate_relationships();
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated_at();
create trigger bikers_updated before update on public.biker_profiles for each row execute function private.touch_updated_at();
create trigger rides_updated before update on public.rides for each row execute function private.touch_updated_at();
create trigger bids_updated before update on public.bids for each row execute function private.touch_updated_at();
create trigger complaints_updated before update on public.complaints for each row execute function private.touch_updated_at();

-- Metadata is untrusted: only customer/biker can be selected at initial signup.
-- Later metadata changes do not update role, account_status, or ownership.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := case when new.raw_user_meta_data->>'role' = 'biker' then 'biker' else 'customer' end;
  v_name text := left(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), 100);
  v_mobile text := regexp_replace(coalesce(new.raw_user_meta_data->>'mobile', ''), '[\s()\-]', '', 'g');
  v_gender text := new.raw_user_meta_data->>'gender';
begin
  if char_length(v_name) < 2 then v_name := 'New user'; end if;
  if v_mobile !~ '^\+?[0-9]{10,15}$' then v_mobile := null; end if;
  if v_gender not in ('female', 'male', 'other', 'undisclosed') then v_gender := null; end if;
  insert into public.profiles(id, full_name, mobile, gender, role) values (new.id, v_name, v_mobile, v_gender, v_role);
  if v_role = 'biker' then insert into public.biker_profiles(id) values (new.id); end if;
  return new;
end;
$$;
create trigger rideshare_new_user after insert on auth.users for each row execute function private.handle_new_user();

-- Every exposed table is protected before the migration commits.
alter table public.profiles enable row level security;
alter table public.biker_profiles enable row level security;
alter table public.rides enable row level security;
alter table public.bids enable row level security;
alter table public.ratings enable row level security;
alter table public.complaints enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on public.profiles, public.biker_profiles, public.rides, public.bids, public.ratings, public.complaints, public.admin_audit_logs from public, anon, authenticated;
grant select on public.profiles, public.biker_profiles, public.rides, public.bids, public.ratings, public.complaints, public.admin_audit_logs to authenticated;
grant all on public.profiles, public.biker_profiles, public.rides, public.bids, public.ratings, public.complaints, public.admin_audit_logs to service_role;
revoke all on all functions in schema private from public, anon, authenticated;

commit;
