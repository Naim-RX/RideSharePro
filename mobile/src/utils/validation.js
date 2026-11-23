export const genderOptions = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'undisclosed' },
];
export const roleOptions = [{ label: 'Customer', value: 'customer' }, { label: 'Biker', value: 'biker' }];

export function validateLogin(values) {
  const errors = {};
  if (!values.email.trim()) errors.email = 'Enter your email address.';
  else if (values.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!values.password || !/\S/.test(values.password)) errors.password = 'Enter your password.';
  else if (values.password.length > 128) errors.password = 'Use no more than 128 characters.';
  return errors;
}

export function validateRegistration(values) {
  const errors = validateLogin(values);
  if (values.fullName.trim().length < 2) errors.fullName = 'Enter your full name (at least 2 characters).';
  else if (values.fullName.trim().length > 100) errors.fullName = 'Use no more than 100 characters.';
  const phone = values.mobile.replace(/[\s()\-]/g, '');
  if (!/^\+?\d{10,15}$/.test(phone)) errors.mobile = 'Enter a mobile number with 10–15 digits.';
  if (!genderOptions.some(({ value }) => value === values.gender)) errors.gender = 'Select a gender option.';
  if (values.password.length < 8 || !/\S/.test(values.password)) errors.password = 'Use at least 8 characters; spaces alone are not enough.';
  if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!roleOptions.some(({ value }) => value === values.role)) errors.role = 'Choose Customer or Biker.';
  return Object.fromEntries(['fullName', 'email', 'mobile', 'gender', 'password', 'confirmPassword', 'role'].filter((key) => errors[key]).map((key) => [key, errors[key]]));
}
