import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import TextField from './TextField';
import ErrorMessage from './ErrorMessage';
import LoadingIndicator from './LoadingIndicator';
import { requestMap } from '../services/mapsService';
import { borders, colors, spacing, typography } from '../theme';

export default function LocationField({ label, onChange, disabled }) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState(false);
  const [suggestions, setSuggestions] = useState([]); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); const [searched, setSearched] = useState(false);
  const token = useRef(null); const version = useRef(0); const abort = useRef(null);
  const sessionStartedAt = useRef(0);
  useEffect(() => {
    if (selected || query.trim().length < 3) return;
    const current = version.current; const controller = new AbortController(); abort.current = controller;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (!token.current || Date.now() - sessionStartedAt.current > 180000) {
          token.current = randomUUID(); sessionStartedAt.current = Date.now();
        }
        const result = await requestMap({ action: 'autocomplete', input: query, sessionToken: token.current }, controller.signal);
        if (version.current === current && !controller.signal.aborted) { setSuggestions(result.suggestions); setSearched(true); }
      } catch (e) { if (version.current === current && !controller.signal.aborted) setError(e.message); }
      finally { if (version.current === current && !controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, selected]);
  useEffect(() => () => { version.current++; abort.current?.abort(); }, []);
  async function choose(suggestion) {
    const current = ++version.current; abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    const sessionToken = token.current; token.current = null;
    setSuggestions([]); setLoading(true); setError(''); setSelected(true);
    try {
      const place = await requestMap({ action: 'details', placeId: suggestion.placeId, sessionToken }, controller.signal);
      if (version.current === current && !controller.signal.aborted) { setQuery(place.label || suggestion.label); onChange({ ...place, customerLabel: query.trim() }); }
    } catch (e) { if (version.current === current && !controller.signal.aborted) { setError(e.message); setSelected(false); } }
    finally { if (version.current === current && !controller.signal.aborted) setLoading(false); }
  }
  return <View style={styles.group}>
    <TextField label={label} value={query} editable={!disabled && !(loading && selected)} autoCorrect={false} maxLength={200}
      placeholder="Search for a location" onChangeText={text => {
        version.current++; abort.current?.abort(); setQuery(text); setSelected(false); setSuggestions([]); setError(''); setLoading(false); setSearched(false); onChange(null);
        if (!text.trim()) token.current = null;
      }} helperText="Type at least 3 characters, then select a suggestion." />
    {loading ? <LoadingIndicator label="Finding location…" /> : null}
    <ErrorMessage message={error} />
    {suggestions.length ? <View style={styles.results}>
      {suggestions.map(item => <Pressable key={item.placeId} accessibilityRole="button" onPress={() => choose(item)} style={styles.item}><Text style={styles.text}>{item.label}</Text></Pressable>)}
      <Text style={styles.attribution}>Google Maps</Text>
    </View> : searched && !loading && !selected && !error ? <Text style={styles.text}>No locations found. Try a more specific address.</Text> : null}
  </View>;
}

export function PlaceAttributions({ place }) {
  return place?.attributions?.map((item, index) => <Text key={index} style={styles.attribution} onPress={/^https:\/\//.test(item.uri || '') ? () => Linking.openURL(item.uri).catch(() => {}) : undefined}>{item.provider || 'Map data provider'}</Text>);
}
const styles = StyleSheet.create({
  group: { gap: spacing.xs }, results: { ...borders.default, backgroundColor: colors.surface },
  item: { padding: spacing.sm, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border },
  text: { ...typography.body, color: colors.text }, attribution: { fontSize: 12, fontWeight: '400', color: '#5E5E5E', padding: 10 },
});
