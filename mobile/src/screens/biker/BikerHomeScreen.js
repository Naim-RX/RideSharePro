import { useCallback, useRef, useState } from 'react';
import { AppState, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import { EmptyState, ErrorMessage, LoadingIndicator, RideCard, ScreenHeader, SecondaryButton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { bikerRideCard, createBikerService, subscribeBiker } from '../../services/bikerService';
import { colors, typography } from '../../theme';

export default function BikerHomeScreen({ navigation }) {
  const { session } = useAuth(); const uid = session.user.id;
  const [online, setOnline] = useState(false); const [ready, setReady] = useState(false); const [rides, setRides] = useState([]);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [more, setMore] = useState(false); const [connected, setConnected] = useState(true);
  const version = useRef(0); const switching = useRef(false); const alive = useRef(false);
  const load = useCallback(async (cursor = null) => {
    if (switching.current) return;
    const current = ++version.current; setLoading(true); setError('');
    try {
      const service = createBikerService(); const status = await service.status(uid);
      if (current !== version.current || !alive.current) return;
      setOnline(status.is_online); setReady(true);
      const data = status.is_online ? await service.list(false, cursor) : [];
      if (current === version.current && alive.current) { setRides(previous => cursor ? [...previous, ...data.filter(row => !previous.some(old => old.id === row.id))] : data); setMore(data.length === 20); }
    } catch (e) { if (current === version.current && alive.current) { setError(e.message); setRides([]); setReady(false); setOnline(false); } }
    finally { if (current === version.current && alive.current) setLoading(false); }
  }, [uid]);
  useFocusEffect(useCallback(() => {
    alive.current = true; load();
    const unsubscribe = subscribeBiker(uid, () => load(), value => { setConnected(value); if (!value) { version.current++; setRides([]); setLoading(false); setReady(false); } });
    const app = AppState.addEventListener('change', state => { if (state === 'active') load(); });
    return () => { alive.current = false; version.current++; unsubscribe(); app.remove(); };
  }, [uid, load]));
  async function toggle(value) {
    if (switching.current) return; switching.current = true; version.current++; setBusy(true); setError(''); setRides([]);
    let issue;
    try { await createBikerService().availability(value); if (alive.current) setOnline(value); }
    catch (e) { issue = e.message; }
    finally { switching.current = false; if (alive.current) { setBusy(false); await load(); if (issue) setError(issue); } }
  }
  return <Screen>
    <ScreenHeader title="Available rides" />
    <SecondaryButton title="My bids" onPress={()=>navigation.navigate('BikerBids')} />
    <View style={styles.row}><Text style={styles.text}>{online ? 'Online' : 'Offline'}</Text><Switch accessibilityLabel="Biker availability" value={online} onValueChange={toggle} disabled={busy || loading || !ready} trackColor={{ true: colors.primary }} /></View>
    {!connected ? <ErrorMessage message="Live updates disconnected. Refresh to check current availability." /> : null}
    <ErrorMessage message={error} onRetry={() => load()} />
    {loading || busy ? <LoadingIndicator label="Checking available rides…" /> : null}
    {!loading && !online && !error ? <EmptyState title="You are offline" message="Go online to browse and bid on ride requests. Add motorcycle details in Profile first." /> : null}
    {!loading && online && !rides.length && !error ? <EmptyState title="No available rides" message="New open requests will appear here while you are online." /> : null}
    {rides.map(ride => <RideCard key={ride.id} ride={bikerRideCard(ride)} actionLabel="View Ride" disabled={busy || !ready} onPress={() => navigation.navigate('BikerRideDetails', { rideId: ride.id })} />)}
    {more && online ? <SecondaryButton title="Load more" disabled={loading || busy} onPress={() => load(rides.at(-1))} /> : null}
    <SecondaryButton title="Refresh rides" onPress={() => load()} disabled={loading || busy} />
  </Screen>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, text: { ...typography.body, color: colors.text } });
