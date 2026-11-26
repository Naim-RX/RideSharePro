import { useCallback, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { randomUUID } from 'expo-crypto';
import Screen from '../../components/Screen';
import { EmptyState, ErrorMessage, LoadingIndicator, PrimaryButton, RideCard, ScreenHeader, SecondaryButton } from '../../components';
import LocationField from '../../components/LocationField';
import { useAuth } from '../../context/AuthContext';
import { createRideService, rideCardData } from '../../services/rideService';
import { colors, spacing, typography } from '../../theme';

export default function CustomerHomeScreen({ navigation }) {
  const { session } = useAuth(); const userId = session.user.id;
  const [pickup, setPickup] = useState(null); const [destination, setDestination] = useState(null);
  const [active, setActive] = useState([]); const [recent, setRecent] = useState([]); const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [validation, setValidation] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const service = createRideService();
      const unresolved = await service.reconcile(userId);
      const [open, history] = await Promise.all([service.list(userId), service.list(userId, true)]);
      if (generation.current === current) {
        setActive(open); setRecent(history.slice(0, 3)); setPending(unresolved);
        if (open.length || unresolved) { setPickup(null); setDestination(null); }
      }
    } catch (e) { if (generation.current === current) setError(e.message); }
    finally { if (generation.current === current) setLoading(false); }
  }, [userId]);
  useFocusEffect(useCallback(() => { load(); return () => { generation.current++; }; }, [load]));
  function next() {
    if (!pickup || !destination || pickup.placeId === destination.placeId || (pickup.latitude === destination.latitude && pickup.longitude === destination.longitude)) {
      setValidation('Select different pickup and destination locations from the suggestions.'); return;
    }
    Keyboard.dismiss(); setValidation('');
    navigation.navigate('CustomerRoutePreview', { pickup, destination, requestKey: randomUUID() });
  }
  return <Screen>
    <ScreenHeader title="Book a ride" />
    {Platform.OS !== 'android' || !Constants.expoConfig?.extra?.googleMapsAndroidConfigured ? <ErrorMessage message="Map preview is not configured on this device." /> : <>
      <LocationField key={`pickup-${active[0]?.id || 'new'}`} label="Pickup" onChange={setPickup} disabled={loading || active.length > 0 || Boolean(pending) || Boolean(error)} />
      <LocationField key={`destination-${active[0]?.id || 'new'}`} label="Destination" onChange={setDestination} disabled={loading || active.length > 0 || Boolean(pending) || Boolean(error)} />
      <ErrorMessage message={validation} />
      <PrimaryButton title="Continue" onPress={next} disabled={loading || !pickup || !destination || active.length > 0 || Boolean(pending) || Boolean(error)} />
    </>}
    {loading ? <LoadingIndicator label="Loading your rides…" /> : null}
    <ErrorMessage message={error} onRetry={load} />
    {pending ? <View style={styles.group}><Text style={styles.text}>A previous ride request still needs confirmation. Resume it before booking another ride.</Text><SecondaryButton title="Resume posting" onPress={() => navigation.navigate('CustomerPostRide', { pending })} /></View> : null}
    <Text accessibilityRole="header" style={styles.heading}>Active ride</Text>
    {active.map(ride => <RideCard key={ride.id} ride={rideCardData(ride)} actionLabel="View bids" onPress={()=>navigation.navigate('CustomerBids',{rideId:ride.id})} />)}
    {!loading && !error && !active.length ? <EmptyState title="No active ride" message="Choose pickup and destination to book your next ride." /> : null}
    <Text accessibilityRole="header" style={styles.heading}>Recent rides</Text>
    {recent.map(ride => <RideCard key={ride.id} ride={rideCardData(ride)} />)}
    {!loading && !error && !recent.length ? <EmptyState title="No recent rides" message="Completed and cancelled rides will appear here." /> : null}
    <SecondaryButton title="Refresh rides" onPress={load} disabled={loading} />
  </Screen>;
}
const styles = StyleSheet.create({ heading: { ...typography.subheading, color: colors.text }, text: { ...typography.body, color: colors.secondary }, group: { gap: spacing.sm } });
