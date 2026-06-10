export const PASSWORD_POLICY_HINT =
  'A senha deve ter mais de 8 caracteres, incluir ao menos uma letra maiúscula e um caractere especial (ex.: !@#$%).';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: PASSWORD_POLICY_HINT };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: PASSWORD_POLICY_HINT };
  }
  return { valid: true, message: null };
}

export function validatePasswordPair(password, passwordConfirm) {
  const base = validatePassword(password);
  if (!base.valid) return base;
  if (password !== passwordConfirm) {
    return { valid: false, message: 'As senhas não coincidem.' };
  }
  return { valid: true, message: null };
}

export function isPasswordFormValid(password, passwordConfirm) {
  return validatePasswordPair(password, passwordConfirm).valid;
}
