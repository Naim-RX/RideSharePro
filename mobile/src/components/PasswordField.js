import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import TextField from './TextField';
import { colors, sizes, spacing, typography } from '../theme';

const PasswordField = forwardRef(function PasswordField({ label = 'Password', editable = true, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      ref={ref}
      label={label}
      editable={editable}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      secureTextEntry={!visible}
      trailing={
        <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} accessibilityState={{ disabled: !editable }} disabled={!editable} onPress={() => setVisible((current) => !current)} style={styles.toggle}>
          <Text style={styles.label}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      }
    />
  );
});

export default PasswordField;

const styles = StyleSheet.create({
  toggle: { minHeight: sizes.buttonHeight, minWidth: sizes.buttonHeight, paddingHorizontal: spacing.sm, justifyContent: 'center', alignItems: 'center' },
  label: { ...typography.label, color: colors.primary },
});
