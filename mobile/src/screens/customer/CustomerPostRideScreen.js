import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import Screen from '../../components/Screen';
import { ErrorMessage, PrimaryButton, ScreenHeader, TextField } from '../../components';
import RouteSummary from '../../components/RouteSummary';
import { useAuth } from '../../context/AuthContext';
import { createRideService, validateDraft, validateFare } from '../../services/rideService';
import { colors, typography } from '../../theme';

export default function CustomerPostRideScreen({ navigation, route }) {
  const params = route.params || {}; const { pickup, destination, estimate, pending, requestKey } = params;
  const { session } = useAuth();
  const [fare, setFare] = useState(pending?.fare || ''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(Boolean(pending)); const lock = useRef(false); const submittedDraft = useRef(pending || null);
  const [invalid, setInvalid] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  async function post() {
    if (lock.current) return;
    if (!validateFare(fare)) { setInvalid('Enter a fare from BDT 0.01 to 999999.99, with at most two decimal places.'); return; }
    const draft = submittedDraft.current || { requestKey, pickupPlaceId: pickup?.placeId, destinationPlaceId: destination?.placeId,
      pickupLabel: pickup?.customerLabel, destinationLabel: destination?.customerLabel, mode: estimate?.mode, fare: fare.trim() };
    if (!validateDraft(draft)) { setError('Route details are missing. Return Home and confirm a new route.'); return; }
    lock.current = true; submittedDraft.current = draft; setAttempted(true); setBusy(true); setError(''); setInvalid('');
    try {
      await createRideService().submit(session.user.id, draft);
      if (alive.current) navigation.reset({ index: 0, routes: [{ name: 'customerAccount' }] });
    } catch (e) { if (alive.current) setError(e.message); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return <Screen>
    <ScreenHeader title="Post ride" onBack={busy ? undefined : () => navigation.goBack()} />
    <RouteSummary pickup={pickup || { label: pending?.pickupLabel || 'Pickup not selected' }} destination={destination || { label: pending?.destinationLabel || 'Destination not selected' }} estimate={estimate} />
    <Text style={{ ...typography.caption, color: colors.secondary }}>Your original location search text is saved as the ride label. Google addresses and route estimates are used for this preview only.</Text>
    <TextField label="Expected fare (BDT)" value={fare} onChangeText={value => { setFare(value); setInvalid(''); }} keyboardType="decimal-pad" editable={!busy && !attempted} error={invalid} maxLength={9} />
    <ErrorMessage message={error} />
    {attempted && !busy ? <Text style={{ ...typography.caption, color: colors.secondary }}>Retry uses the same ride details so a connection failure cannot create a duplicate.</Text> : null}
    <PrimaryButton title={attempted && !busy ? 'Retry Post Ride' : 'Post Ride'} loading={busy} onPress={post} />
  </Screen>;
}
