import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wordmark}>
        <Text accessibilityRole="header" style={styles.title}>RideShare Pro</Text>
        <Text style={styles.subtitle}>Motorcycle Ride Sharing</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, justifyContent: 'center', padding: spacing.sm },
  wordmark: { alignItems: 'center', gap: spacing.xs },
  title: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.caption, color: colors.secondary },
});
