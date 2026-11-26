import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import { ErrorMessage, LoadingIndicator, PrimaryButton, ScreenHeader, TextField } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { createBikerService } from '../../services/bikerService';
import { colors, typography } from '../../theme';
export default function BikerProfileScreen() {
  const auth = useAuth(); const [model,setModel] = useState(''); const [plate,setPlate] = useState(''); const [loading,setLoading] = useState(true); const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [notice,setNotice] = useState(''); const lock = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true);
    createBikerService().status(auth.session.user.id).then(data => { if (active) { setModel(data.motorcycle_model || ''); setPlate(data.plate_number || ''); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.session.user.id]));
  async function save() {
    if (lock.current) return; lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await createBikerService().motorcycle(model,plate); setNotice('Motorcycle details saved.'); }
    catch(e) { setError(e.message); } finally { setBusy(false); lock.current = false; }
  }
  return <Screen><ScreenHeader title="Biker profile" subtitle={auth.profile.full_name} /><Text style={styles.text}>{auth.session.user.email}</Text><Text style={styles.text}>{auth.profile.mobile}</Text>
    {loading ? <LoadingIndicator label="Loading your motorcycle…" /> : null}<ErrorMessage message={error} />
    <TextField label="Motorcycle model" value={model} onChangeText={setModel} editable={!busy && !loading} maxLength={80} />
    <TextField label="Plate number" value={plate} onChangeText={setPlate} editable={!busy && !loading} autoCapitalize="characters" maxLength={40} />
    <PrimaryButton title="Save motorcycle" onPress={save} loading={busy} disabled={loading} />
    {notice ? <Text accessibilityRole="alert" style={styles.text}>{notice}</Text> : null}<PrimaryButton title="Logout" onPress={auth.logout} disabled={busy} />
  </Screen>;
}
const styles = { text: { ...typography.body, color: colors.text } };
