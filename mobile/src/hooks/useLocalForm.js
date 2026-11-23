import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { toAuthIssue } from '../services/authErrors';

// Validate locally before invoking the supplied asynchronous account operation.
export default function useLocalForm(initialValues, validate, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const submitLock = useRef(false);
  const validation = validate(values);
  const errors = Object.fromEntries(Object.entries(validation).filter(([key]) => touched[key]));

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setMessage('');
    setError(null);
  }

  function blur(name) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  async function submit() {
    if (submitLock.current) return null;
    setTouched(Object.fromEntries(Object.keys(values).map((key) => [key, true])));
    setMessage('');
    setError(null);
    if (Object.keys(validation).length) return Object.keys(validation)[0];
    submitLock.current = true;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const notice = await onSubmit(values);
      setMessage(notice || '');
      return null;
    } catch (issue) {
      setError(toAuthIssue(issue));
      return null;
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return { values, errors, submitting, message, error, change, blur, submit };
}
