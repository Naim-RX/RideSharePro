import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ErrorMessage, PasswordField, PrimaryButton, ScreenHeader, SecondaryButton, TextField } from '../../components';
import Screen from '../../components/Screen';
import useLocalForm from '../../hooks/useLocalForm';
import { validateLogin } from '../../utils/validation';
import styles from './styles';
import { useAuth } from '../../context/AuthContext';
import { toAuthIssue } from '../../services/authErrors';

export default function LoginScreen({ navigation }) {
  const refs = useRef({});
  const auth = useAuth();
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [resendError, setResendError] = useState('');
  const form = useLocalForm({ email: '', password: '' }, validateLogin, auth.login);
  async function resend() {
    if (resending) return;
    setResending(true);
    setResendError('');
    try { setResendNotice(await auth.resendConfirmation(form.values.email)); }
    catch (error) { setResendError(toAuthIssue(error).message); }
    finally { setResending(false); }
  }
  async function submit() {
    if (resending) return;
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
          onChangeText={(value) => { setResendNotice(''); setResendError(''); form.change('email', value); }}
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
          editable={!form.submitting && !resending}
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
          editable={!form.submitting && !resending}
        />
        <PrimaryButton title="Login" onPress={submit} loading={form.submitting} disabled={resending} />
        <ErrorMessage message={form.error?.message} />
        {form.error?.code === 'email_not_confirmed' ? <SecondaryButton title="Resend confirmation email" onPress={resend} loading={resending} disabled={form.submitting} /> : null}
        <ErrorMessage message={resendError} />
        {resendNotice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{resendNotice}</Text> : null}
        {auth.notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{auth.notice}</Text> : null}
        {form.message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{form.message}</Text> : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>New to RideShare Pro?</Text>
        <Pressable accessibilityRole="link" accessibilityState={{ disabled: form.submitting || resending }} disabled={form.submitting || resending} onPress={() => navigation.navigate('Registration')} style={styles.link}>
          <Text style={styles.linkText}>Register</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>Use the email address registered with your account.</Text>
    </Screen>
  );
}
