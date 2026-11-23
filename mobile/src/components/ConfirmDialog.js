import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { borders, colors, sizes, spacing, typography } from '../theme';

export default function ConfirmDialog({ visible = false, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel', loading = false, disabled = false }) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => { if (!loading) onCancel?.(); }}>
      <SafeAreaView style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <PrimaryButton title={confirmLabel} onPress={onConfirm} loading={loading} disabled={disabled || !onConfirm} />
          <SecondaryButton title={cancelLabel} onPress={onCancel} disabled={loading} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.overlay },
  dialog: { ...borders.default, width: '100%', maxWidth: sizes.contentWidth, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
  title: { ...typography.heading, color: colors.text },
  message: { ...typography.body, color: colors.secondary },
});
