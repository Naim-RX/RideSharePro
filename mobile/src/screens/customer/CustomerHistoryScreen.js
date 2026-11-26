import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import { EmptyState, ErrorMessage, LoadingIndicator, RideCard, ScreenHeader, SecondaryButton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { createRideService, rideCardData } from '../../services/rideService';

export default function CustomerHistoryScreen() {
  const { session } = useAuth(); const userId = session.user.id;
  const [rides, setRides] = useState([]); const [loading, setLoading] = useState(false); const [more, setMore] = useState(false); const [error, setError] = useState('');
  const generation = useRef(0); const busy = useRef(false);
  const load = useCallback(async (offset = 0) => {
    if (busy.current) return; busy.current = true;
    const current = ++generation.current; setLoading(true); setError('');
    try { const data = await createRideService().list(userId, true, offset); if (generation.current === current) { setRides(previous => offset ? [...previous, ...data] : data); setMore(data.length === 20); } }
    catch (e) { if (generation.current === current) setError(e.message); }
    finally { if (generation.current === current) { busy.current = false; setLoading(false); } }
  }, [userId]);
  useFocusEffect(useCallback(() => { load(); return () => { generation.current++; busy.current = false; }; }, [load]));
  return <Screen><ScreenHeader title="Ride history" />
    {rides.map(ride => <RideCard key={ride.id} ride={rideCardData(ride)} />)}
    {loading ? <LoadingIndicator label="Loading history…" /> : null}
    <ErrorMessage message={error} onRetry={() => load()} />
    {!loading && !error && !rides.length ? <EmptyState title="No ride history" message="Completed and cancelled rides will appear here." /> : null}
    {more ? <SecondaryButton title="Load more" onPress={() => load(rides.length)} disabled={loading} /> : null}
    <SecondaryButton title="Refresh history" onPress={() => load()} disabled={loading} />
  </Screen>;
}
