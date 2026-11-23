import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borders, colors, sizes, spacing, typography } from '../theme';

export default function OptionSelector({ label, options, value, onChange, error, disabled = false }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.options}>
        {options.map((option) => {
          const selected = value === option.value;
          return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => onChange(option.value)} style={[styles.option, selected && styles.selected]}><Text style={[styles.optionText, selected && styles.selectedText]}>{option.label}</Text></Pressable>;
        })}
      </View>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.label, color: colors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: { ...borders.default, minHeight: sizes.buttonHeight, minWidth: '45%', flexGrow: 1, padding: spacing.xs, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { ...typography.body, color: colors.text },
  selectedText: { color: colors.primary, fontWeight: '600' },
  error: { ...typography.caption, color: colors.danger },
});
