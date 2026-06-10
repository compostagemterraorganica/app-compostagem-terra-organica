const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;

const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter mais de 8 caracteres, incluir ao menos uma letra maiuscula e um caractere especial.';

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: PASSWORD_POLICY_MESSAGE };
  }
  if (password !== password.trim()) {
    return { valid: false, message: 'A senha nao pode comecar ou terminar com espacos.' };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: PASSWORD_POLICY_MESSAGE };
  }
  return { valid: true, message: null };
}

function validatePasswordPair(password, passwordConfirm) {
  const base = validatePassword(password);
  if (!base.valid) return base;
  if (password !== passwordConfirm) {
    return { valid: false, message: 'As senhas nao coincidem.' };
  }
  return { valid: true, message: null };
}

module.exports = {
  PASSWORD_REGEX,
  PASSWORD_POLICY_MESSAGE,
  validatePassword,
  validatePasswordPair
};
