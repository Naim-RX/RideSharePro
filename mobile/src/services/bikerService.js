import { getSupabase } from './supabase';
import { validateFare } from './rideService';

function fail(error) {
  if (error?.code === '42501') return new Error('Go online with an active biker account and choose an available ride.');
  if (error?.code === '23514') return new Error('Add your motorcycle model and plate in Profile before going online.');
  if (error?.code === '22023') return new Error('Enter a positive BDT fare with at most two decimal places.');
  return new Error('Could not complete this request. Check your connection and try again.');
}
export function createBikerService(client = getSupabase()) {
  return {
    async status(userId) {
      const [profile, biker] = await Promise.all([
        client.from('profiles').select('role,account_status').eq('id', userId).maybeSingle(),
        client.from('biker_profiles').select('is_online,motorcycle_model,plate_number').eq('id', userId).maybeSingle(),
      ]);
      if (profile.error || biker.error) throw fail(profile.error || biker.error);
      if (profile.data?.role !== 'biker' || profile.data?.account_status !== 'active' || !biker.data) throw fail({ code: '42501' });
      return biker.data;
    },
    async availability(online) {
      const { data, error } = await client.rpc('set_biker_availability', { p_online: online });
      if (error) throw fail(error); return data;
    },
    async motorcycle(model, plate) {
      if (model.trim().length < 2 || model.trim().length > 80 || plate.trim().length < 3 || plate.trim().length > 40) throw new Error('Enter a motorcycle model and valid plate number.');
      const { error } = await client.rpc('update_my_motorcycle', { p_model: model.trim(), p_plate: plate.trim() });
      if (error?.code === '23505') throw new Error('That plate is already registered.');
      if (error) throw fail(error);
    },
    async list(history = false, cursor = null) {
      const { data, error } = await client.rpc('list_biker_rides', { p_history: history, p_before: cursor?.created_at || null, p_before_id: cursor?.id || null });
      if (error) throw fail(error); return data || [];
    },
    async detail(rideId) {
      const { data, error } = await client.rpc('get_biker_ride', { p_ride_id: rideId });
      if (error) throw fail(error);
      if (!data?.[0]) throw new Error('This ride is no longer available. Return Home to refresh.');
      return data[0];
    },
    async bid(rideId, amount) {
      if (!validateFare(amount)) throw fail({ code: '22023' });
      const { data, error } = await client.rpc('submit_bid', { p_ride_id: rideId, p_amount: amount.trim() });
      if (error?.code === '23514') throw new Error('This bid can no longer be changed. Refresh the ride status.');
      if (error) throw fail(error); return data;
    },
  };
}

// Notifications are invalidations only. All displayed data is fetched again
// through authorized projections, including on initial join and reconnect.
export function subscribeBiker(userId, onChange, onStatus, client = getSupabase()) {
  let disposed = false; let timer;
  const refresh = () => { clearTimeout(timer); timer = setTimeout(() => { if (!disposed) onChange(); }, 350); };
  const channel = client.channel(`biker-dashboard:${userId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_availability_events' }, refresh)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'biker_profiles', filter: `id=eq.${userId}` }, refresh)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, refresh);
  const joined = status => {
      if (disposed) return;
      if (status === 'SUBSCRIBED') { onStatus?.(true); refresh(); }
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) onStatus?.(false);
  };
  void (async () => {
    try {
      const { data, error } = await client.auth.getSession();
      if (disposed) return;
      if (error || !data.session || data.session.user.id !== userId) { onStatus?.(false); return; }
      await client.realtime.setAuth(data.session.access_token);
      if (!disposed) channel.subscribe(joined);
    } catch { if (!disposed) onStatus?.(false); }
  })();
  return () => { disposed = true; clearTimeout(timer); void client.removeChannel(channel); };
}

export function bikerRideCard(ride) {
  return { status: ride.status, pickupLabel: ride.pickup_label, destinationLabel: ride.destination_label,
    distanceLabel: ride.distance_meters ? `${(ride.distance_meters / 1000).toFixed(1)} km` : 'Distance: view route estimate',
    durationLabel: ride.duration_seconds ? `${Math.ceil(ride.duration_seconds / 60)} min` : null,
    fareLabel: `Expected fare: BDT ${Number(ride.expected_fare).toFixed(2)}` };
}
