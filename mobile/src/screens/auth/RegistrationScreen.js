import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { ErrorMessage, PasswordField, PrimaryButton, ScreenHeader, SecondaryButton, TextField } from '../../components';
import OptionSelector from '../../components/OptionSelector';
import Screen from '../../components/Screen';
import useLocalForm from '../../hooks/useLocalForm';
import { genderOptions, roleOptions, validateRegistration } from '../../utils/validation';
import styles from './styles';
import { useAuth } from '../../context/AuthContext';
import { toAuthIssue } from '../../services/authErrors';

const initialValues = {
  fullName: '',
  email: '',
  mobile: '',
  gender: '',
  password: '',
  confirmPassword: '',
  role: 'customer',
};

export default function RegistrationScreen({ navigation }) {
  const refs = useRef({});
  const scrollRef = useRef(null);
  const auth = useAuth();
  const form = useLocalForm(initialValues, validateRegistration, auth.register);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  async function resend() {
    if (resending) return;
    setResending(true);
    setResendError('');
    try { setResendMessage(await auth.resendConfirmation(form.values.email)); }
    catch (error) { setResendError(toAuthIssue(error).message); }
    finally { setResending(false); }
  }
  async function submit() {
    if (resending) return;
    const firstError = await form.submit();
    if (firstError && refs.current[firstError]) refs.current[firstError].focus();
    else if (firstError) {
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }
  function field(name) {
    return {
      value: form.values[name],
      onChangeText: (value) => {
        if (name === 'email') { setResendMessage(''); setResendError(''); }
        form.change(name, value);
      },
      onBlur: () => form.blur(name),
      error: form.errors[name],
      editable: !form.submitting && !resending,
    };
  }
  return (
    <Screen scrollRef={scrollRef}>
      <ScreenHeader title="Create account" subtitle="Join as a customer or biker." backLabel="Back to login" onBack={form.submitting || resending ? undefined : () => navigation.goBack()} />
      <View style={styles.form}>
        <TextField
          ref={(ref) => { refs.current.fullName = ref; }}
          {...field('fullName')}
          label="Full name"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => refs.current.email?.focus()}
        />
        <TextField
          ref={(ref) => { refs.current.email = ref; }}
          {...field('email')}
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => refs.current.mobile?.focus()}
        />
        <TextField
          ref={(ref) => { refs.current.mobile = ref; }}
          {...field('mobile')}
          label="Mobile number"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => refs.current.password?.focus()}
        />
        <OptionSelector
          label="Gender"
          options={genderOptions}
          value={form.values.gender}
          onChange={(value) => { Keyboard.dismiss(); form.change('gender', value); form.blur('gender'); }}
          error={form.errors.gender}
          disabled={form.submitting || resending}
        />
        <PasswordField
          ref={(ref) => { refs.current.password = ref; }}
          {...field('password')}
          label="Password"
          helperText="Use at least 8 characters."
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => refs.current.confirmPassword?.focus()}
        />
        <PasswordField
          ref={(ref) => { refs.current.confirmPassword = ref; }}
          {...field('confirmPassword')}
          label="Confirm password"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <OptionSelector
          label="I want to join as"
          options={roleOptions}
          value={form.values.role}
          onChange={(value) => { Keyboard.dismiss(); form.change('role', value); form.blur('role'); }}
          error={form.errors.role}
          disabled={form.submitting || resending}
        />
        <PrimaryButton title="Create Account" onPress={submit} loading={form.submitting} disabled={resending} />
        <ErrorMessage message={form.error?.message} />
        {form.message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{form.message}</Text> : null}
        {form.message ? <SecondaryButton title="Resend confirmation email" onPress={resend} loading={resending} disabled={form.submitting} /> : null}
        <ErrorMessage message={resendError} />
        {resendMessage ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{resendMessage}</Text> : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Pressable accessibilityRole="link" accessibilityState={{ disabled: form.submitting || resending }} disabled={form.submitting || resending} onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Login</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>Your mobile number is stored in your profile. No SMS verification is required.</Text>
    </Screen>
  );
}
