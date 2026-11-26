import { useEffect, useRef, useState } from 'react';
import Screen from '../../components/Screen';
import { ErrorMessage, LoadingIndicator, PrimaryButton, ScreenHeader } from '../../components';
import RouteMap from '../../components/RouteMap';
import RouteSummary from '../../components/RouteSummary';
import { requestMap } from '../../services/mapsService';
import { decodePolyline } from '../../utils/polyline';

export default function CustomerRoutePreviewScreen({ navigation, route: screenRoute }) {
  const { pickup, destination, requestKey } = screenRoute.params || {};
  const [estimate, setEstimate] = useState(null); const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  const confirmed = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    if (!pickup || !destination) return;
    async function load() {
      try {
        const data = await requestMap({ action: 'route', origin: { latitude: pickup.latitude, longitude: pickup.longitude }, destination: { latitude: destination.latitude, longitude: destination.longitude } }, controller.signal);
        const coordinates = decodePolyline(data.encodedPolyline);
        if (!controller.signal.aborted) setEstimate({ ...data, coordinates });
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
    }
    load(); return () => controller.abort();
  }, [pickup, destination, attempt]);
  return <Screen>
    <ScreenHeader title="Route preview" onBack={() => navigation.goBack()} />
    {!pickup || !destination ? <ErrorMessage message="Choose pickup and destination from Home first." /> : <>
      <RouteSummary pickup={pickup} destination={destination} estimate={estimate} />
      {!estimate && !error ? <LoadingIndicator label="Finding a road route…" /> : null}
      <ErrorMessage message={error} onRetry={() => { setError(''); setAttempt(value => value + 1); }} />
      {estimate ? <RouteMap pickup={pickup} destination={destination} coordinates={estimate.coordinates} /> : null}
      <PrimaryButton title="Confirm Route" disabled={!estimate || Boolean(error)} onPress={() => {
        if (confirmed.current || !estimate) return; confirmed.current = true;
        navigation.replace('CustomerPostRide', { pickup, destination, estimate, requestKey });
      }} />
    </>}
  </Screen>;
}
