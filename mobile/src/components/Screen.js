import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, sizes, spacing } from '../theme';

export default function Screen({ children, edges = ['top', 'bottom', 'left', 'right'], scrollRef }) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={styles.avoid} behavior="padding">
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  avoid: { flex: 1 },
  content: { width: '100%', maxWidth: sizes.contentWidth, alignSelf: 'center', padding: spacing.sm, gap: spacing.md, flexGrow: 1 },
});
