import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Screen from '../../components/Screen';
import { PrimaryButton, ScreenHeader, StatusBadge } from '../../components';
import { borders, colors, spacing, typography } from '../../theme';

export default function AccountScreen({ role }) {
  const auth = useAuth();
  const titles = { customer: 'Customer account', biker: 'Biker account', admin: 'Administrator account' };
  return (
    <Screen>
      <ScreenHeader title={titles[role]} subtitle={`Welcome, ${auth.profile.full_name}.`} />
      <View style={styles.details}>
        <StatusBadge label={role === 'biker' ? 'Biker' : role === 'admin' ? 'Administrator' : 'Customer'} tone="info" />
        <Text style={styles.text}>{auth.session.user.email}</Text>
        <Text style={styles.text}>{auth.profile.mobile}</Text>
      </View>
      {role === 'admin' ? <Text style={styles.secondary}>Use the administrator web application to manage RideShare Pro.</Text> : <Text style={styles.secondary}>You are signed in to RideShare Pro.</Text>}
      <PrimaryButton title="Logout" onPress={auth.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  details: { ...borders.default, padding: spacing.sm, backgroundColor: colors.surface, gap: spacing.sm },
  text: { ...typography.body, color: colors.text },
  secondary: { ...typography.body, color: colors.secondary },
});
