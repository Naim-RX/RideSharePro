import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PasswordField, PrimaryButton, ScreenHeader, TextField } from '../../components';
import Screen from '../../components/Screen';
import useLocalForm from '../../hooks/useLocalForm';
import { validateLogin } from '../../utils/validation';
import styles from './styles';

export default function LoginScreen({ navigation }) {
  const refs = useRef({});
  const form = useLocalForm({ email: '', password: '' }, validateLogin, 'Your details passed the local checks. Login is not available yet.');
  async function submit() {
    const firstError = await form.submit();
    if (firstError) refs.current[firstError]?.focus();
  }
  return (
    <Screen>
      <View style={styles.heading}>
        <ScreenHeader title="RideShare Pro" subtitle="Welcome back. Log in to continue." />
      </View>
      <View style={styles.form}>
        <TextField
          ref={(ref) => { refs.current.email = ref; }}
          label="Email"
          value={form.values.email}
          onChangeText={(value) => form.change('email', value)}
          onBlur={() => form.blur('email')}
          error={form.errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => refs.current.password?.focus()}
          editable={!form.submitting}
        />
        <PasswordField
          ref={(ref) => { refs.current.password = ref; }}
          label="Password"
          value={form.values.password}
          onChangeText={(value) => form.change('password', value)}
          onBlur={() => form.blur('password')}
          error={form.errors.password}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={submit}
          editable={!form.submitting}
        />
        <PrimaryButton title="Login" onPress={submit} loading={form.submitting} />
        {form.message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{form.message}</Text> : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>New to RideShare Pro?</Text>
        <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Registration')} style={styles.link}>
          <Text style={styles.linkText}>Register</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>Account access is not connected yet.</Text>
    </Screen>
  );
}
