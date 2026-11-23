import { Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Screen from '../../components/Screen';
import { ErrorMessage, PrimaryButton, ScreenHeader, SecondaryButton } from '../../components';
import { colors, typography } from '../../theme';

export default function AccountAccessScreen() {
  const auth = useAuth();
  const suspended = auth.phase === 'suspended';
  return (
    <Screen>
      <ScreenHeader title={suspended ? 'Account suspended' : 'Account access unavailable'} />
      {suspended ? <Text style={styles.text}>Your account is suspended. Contact support before using RideShare Pro.</Text> : <ErrorMessage message={auth.error?.message || 'Your account could not be verified. Please try again.'} />}
      <PrimaryButton title="Try again" onPress={auth.retry} />
      {auth.session ? <SecondaryButton title="Logout" onPress={auth.logout} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ text: { ...typography.body, color: colors.secondary } });
