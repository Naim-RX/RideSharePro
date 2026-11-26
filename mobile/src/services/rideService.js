import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabase';

const fields = 'id,request_key,customer_id,status,pickup_label,destination_label,expected_fare,agreed_fare,created_at,routing_mode';
const key = userId => `rideshare:pending-ride:${userId}`;
export function validateFare(value) {
  return typeof value === 'string' && /^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0 && Number(value) < 1000000;
}
export function validateDraft(draft) {
  const place = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,255}$/.test(value);
  const label = value => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 200;
  return Boolean(draft && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draft.requestKey) && place(draft.pickupPlaceId) && place(draft.destinationPlaceId)
    && draft.pickupPlaceId !== draft.destinationPlaceId && label(draft.pickupLabel) && label(draft.destinationLabel)
    && ['TWO_WHEELER', 'DRIVE'].includes(draft.mode) && validateFare(draft.fare));
}
function failure(error) {
  if (error?.code === '23505') return new Error('You already have an active ride. Return Home and refresh your rides.');
  if (error?.code === '42501') return new Error('An active customer account is required. Sign in again or contact support.');
  if (['22023', '23514', '23502'].includes(error?.code)) return new Error('Ride details are invalid. Check your locations and fare.');
  return new Error('Could not confirm your ride. Check your connection and retry the same request.');
}
export function createRideService(client = getSupabase(), storage = AsyncStorage) {
  return {
    async pending(userId) {
      const raw = await storage.getItem(key(userId));
      if (!raw) return null;
      let draft; try { draft = JSON.parse(raw); } catch { throw new Error('Saved ride request is unreadable. Contact support before posting another ride.'); }
      if (!validateDraft(draft)) throw new Error('Saved ride request is invalid. Contact support before posting another ride.');
      return draft;
    },
    async submit(userId, draft) {
      if (!validateDraft(draft)) throw new Error('Select valid locations and enter a positive fare with at most two decimal places.');
      const pending = await this.pending(userId);
      if (pending && JSON.stringify(pending) !== JSON.stringify(draft)) throw new Error('A previous request needs confirmation. Resume it from Home.');
      // Persist before sending. An ambiguous network result must keep this exact payload/key.
      try { await storage.setItem(key(userId), JSON.stringify(draft)); }
      catch { throw new Error('Could not save the pending request on this device. No ride was submitted. Free storage and retry.'); }
      const { data, error } = await client.rpc('post_customer_ride', {
        p_request_key: draft.requestKey, p_pickup_place_id: draft.pickupPlaceId, p_destination_place_id: draft.destinationPlaceId,
        p_pickup_label: draft.pickupLabel.trim(), p_destination_label: draft.destinationLabel.trim(),
        p_routing_mode: draft.mode, p_expected_fare: draft.fare.trim(),
      });
      if (error || !data) {
        if (['23505', '42501', '22023', '23514', '23502'].includes(error?.code)) await storage.removeItem(key(userId));
        throw failure(error);
      }
      await storage.removeItem(key(userId));
      return data;
    },
    async reconcile(userId) {
      const pending = await this.pending(userId);
      if (!pending) return null;
      const { data, error } = await client.from('rides').select('id').eq('customer_id', userId).eq('request_key', pending.requestKey).maybeSingle();
      if (error) throw failure(error);
      if (data) { await storage.removeItem(key(userId)); return null; }
      return pending;
    },
    async list(userId, history = false, offset = 0) {
      let query = client.from('rides').select(fields).eq('customer_id', userId);
      query = history ? query.in('status', ['completed', 'cancelled']) : query.in('status', ['open', 'assigned', 'in_progress']);
      const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 19);
      if (error) throw new Error('Could not load your rides. Check your connection and retry.');
      return data || [];
    },
  };
}
export function rideCardData(ride) {
  return { status: ride.status, pickupLabel: ride.pickup_label, destinationLabel: ride.destination_label, fareLabel: `BDT ${Number(ride.agreed_fare ?? ride.expected_fare).toFixed(2)}` };
}
