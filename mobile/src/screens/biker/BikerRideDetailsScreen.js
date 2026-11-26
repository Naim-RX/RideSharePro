import { useCallback, useRef, useState } from 'react';
import { Platform, Text } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import { ErrorMessage, LoadingIndicator, PrimaryButton, RideCard, ScreenHeader, SecondaryButton, TextField } from '../../components';
import RouteMap from '../../components/RouteMap';
import RouteSummary from '../../components/RouteSummary';
import { useAuth } from '../../context/AuthContext';
import { bikerRideCard, createBikerService, subscribeBiker } from '../../services/bikerService';
import { requestMap } from '../../services/mapsService';
import { validateFare } from '../../services/rideService';
import { decodePolyline } from '../../utils/polyline';
import { colors, typography } from '../../theme';

export default function BikerRideDetailsScreen({ route, navigation }) {
  const { session } = useAuth(); const rideId = route.params?.rideId;
  const [ride, setRide] = useState(null); const [estimate, setEstimate] = useState(null); const [fare, setFare] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [mapBusy, setMapBusy] = useState(false); const [error, setError] = useState(''); const [mapError, setMapError] = useState(''); const [notice, setNotice] = useState('');
  const [fareError, setFareError] = useState('');
  const version = useRef(0); const alive = useRef(false); const bidLock = useRef(false); const mapAbort = useRef(null);
  const load = useCallback(async () => {
    const current = ++version.current; setLoading(true); setError('');
    try { const result = await createBikerService().detail(rideId); if (alive.current && current === version.current) { setRide(result); } }
    catch (e) { if (alive.current && current === version.current) { setRide(null); setEstimate(null); mapAbort.current?.abort(); setMapBusy(false); setError(e.message); } }
    finally { if (alive.current && current === version.current) setLoading(false); }
  }, [rideId]);
  useFocusEffect(useCallback(() => {
    alive.current = true; load();
    const stop = subscribeBiker(session.user.id, load, connected => { if (!connected) { version.current++; setRide(null); setEstimate(null); mapAbort.current?.abort(); setMapBusy(false); setLoading(false); setError('Live availability disconnected. Refresh before bidding.'); } });
    return () => { alive.current = false; version.current++; mapAbort.current?.abort(); stop(); };
  }, [load, session.user.id]));
  async function preview() {
    mapAbort.current?.abort(); const controller = new AbortController(); mapAbort.current = controller; setMapBusy(true); setMapError(''); setEstimate(null);
    try {
      const data = await requestMap({ action: 'biker_route', rideId }, controller.signal);
      const coordinates = decodePolyline(data.encodedPolyline);
      if (!controller.signal.aborted && alive.current) setEstimate({ ...data, coordinates, pickup: data.pickup || coordinates[0], destination: data.destination || coordinates.at(-1) });
    } catch (e) { if (!controller.signal.aborted && alive.current) setMapError(e.message); }
    finally { if (!controller.signal.aborted && alive.current) setMapBusy(false); }
  }
  async function bid() {
    if (bidLock.current || !ride) return;
    if (!validateFare(fare)) { setFareError('Enter a positive BDT fare with at most two decimal places.'); return; }
    bidLock.current = true; setBusy(true); setError(''); setFareError(''); setNotice('');
    try { await createBikerService().bid(rideId, fare); if (alive.current) { setNotice('Bid submitted. Your fare offer is pending.'); await load(); } }
    catch (e) { if (alive.current) setError(e.message); }
    finally { bidLock.current = false; if (alive.current) setBusy(false); }
  }
  return <Screen>
    <ScreenHeader title="Ride details" onBack={() => navigation.goBack()} />
    {loading ? <LoadingIndicator label="Checking this ride…" /> : null}{!ride ? <ErrorMessage message={error} onRetry={load} /> : null}
    {ride ? <>
      <RideCard ride={bikerRideCard(ride)} />
      {ride.proposed_fare ? <Text style={styles.text}>Your current bid: BDT {Number(ride.proposed_fare).toFixed(2)} ({ride.bid_status})</Text> : null}
      {Platform.OS === 'android' && Constants.expoConfig?.extra?.googleMapsAndroidConfigured ? <SecondaryButton title="Preview route" onPress={preview} loading={mapBusy} disabled={loading || busy || mapBusy} /> : <Text style={styles.text}>Map preview is not configured on this device.</Text>}
      <ErrorMessage message={mapError} />
      {estimate ? <><RouteSummary pickup={{ label: ride.pickup_label }} destination={{ label: ride.destination_label }} estimate={estimate} /><RouteMap pickup={estimate.pickup} destination={estimate.destination} coordinates={estimate.coordinates} /></> : null}
      <TextField label="Proposed fare (BDT)" value={fare} onChangeText={value => { setFare(value); setFareError(''); }} keyboardType="decimal-pad" editable={!busy} maxLength={9} error={fareError} helperText="Enter a positive amount with at most two decimal places." />
      <ErrorMessage message={error} onRetry={load} />
      <PrimaryButton title="Submit Bid" onPress={bid} loading={busy} disabled={loading || !fare || (ride.bid_status && ride.bid_status !== 'pending')} />
      {notice ? <Text accessibilityRole="alert" style={styles.text}>{notice}</Text> : null}
    </> : null}
  </Screen>;
}
const styles = { text: { ...typography.body, color: colors.text } };
