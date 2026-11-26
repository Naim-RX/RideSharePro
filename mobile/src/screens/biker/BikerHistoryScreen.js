import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import { EmptyState, ErrorMessage, LoadingIndicator, RideCard, ScreenHeader, SecondaryButton } from '../../components';
import { bikerRideCard, createBikerService } from '../../services/bikerService';
export default function BikerHistoryScreen() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(false); const [more, setMore] = useState(false); const [error, setError] = useState(''); const version = useRef(0);
  const load = useCallback(async (cursor = null) => {
    const current = ++version.current; setLoading(true); setError('');
    try { const data = await createBikerService().list(true, cursor); if (current === version.current) { setRows(previous => cursor ? [...previous,...data] : data); setMore(data.length === 20); } }
    catch (e) { if (current === version.current) setError(e.message); }
    finally { if (current === version.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); return () => { version.current++; }; }, [load]));
  return <Screen><ScreenHeader title="Ride history" />{loading ? <LoadingIndicator label="Loading history…" /> : null}<ErrorMessage message={error} onRetry={() => load()} />
    {rows.map(row => <RideCard key={row.id} ride={bikerRideCard(row)} />)}
    {!loading && !error && !rows.length ? <EmptyState title="No ride history" message="Your completed and cancelled assigned rides will appear here." /> : null}
    {more ? <SecondaryButton title="Load more" disabled={loading} onPress={() => load(rows.at(-1))} /> : null}<SecondaryButton title="Refresh history" disabled={loading} onPress={() => load()} />
  </Screen>;
}
