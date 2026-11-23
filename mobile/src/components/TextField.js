import { forwardRef, useId, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { borders, colors, sizes, spacing, typography } from '../theme';

const TextField = forwardRef(function TextField({ label, error, helperText, trailing, onFocus, onBlur, editable = true, ...props }, ref) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <Text nativeID={id} style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && borders.focused, error && borders.invalid, !editable && styles.disabled]}>
        <TextInput
          {...props}
          ref={ref}
          editable={editable}
          accessibilityLabel={label}
          accessibilityLabelledBy={id}
          accessibilityHint={error || helperText}
          placeholderTextColor={colors.secondary}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          style={styles.input}
        />
        {trailing}
      </View>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.label, color: colors.text },
  field: { ...borders.default, minHeight: sizes.inputHeight, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
  input: { ...typography.body, flex: 1, minWidth: 0, minHeight: sizes.inputHeight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, color: colors.text },
  disabled: { backgroundColor: colors.background },
  error: { ...typography.caption, color: colors.danger },
  helper: { ...typography.caption, color: colors.secondary },
});
