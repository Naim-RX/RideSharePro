import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';

// Local validation only; no credentials are sent, logged, or persisted.
export default function useLocalForm(initialValues, validate, notice) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const submitLock = useRef(false);
  const validation = validate(values);
  const errors = Object.fromEntries(Object.entries(validation).filter(([key]) => touched[key]));

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setMessage('');
  }

  function blur(name) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  async function submit() {
    if (submitLock.current) return null;
    setTouched(Object.fromEntries(Object.keys(values).map((key) => [key, true])));
    setMessage('');
    if (Object.keys(validation).length) return Object.keys(validation)[0];
    submitLock.current = true;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      // Yield once for the UI's loading lifecycle, without a fake network delay.
      await Promise.resolve();
      setMessage(notice);
      return null;
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return { values, errors, submitting, message, change, blur, submit };
}
