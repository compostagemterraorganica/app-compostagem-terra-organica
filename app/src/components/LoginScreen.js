import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import authService from '../services/authService';
import PasswordInput from './PasswordInput';
import {
  PASSWORD_POLICY_HINT,
  isPasswordFormValid,
  validatePasswordPair
} from '../utils/passwordPolicy';

const STEPS = {
  EMAIL: 'email',
  LOGIN: 'login',
  VERIFY_CODE: 'verify-code',
  SET_PASSWORD: 'set-password',
  RESET_EMAIL: 'reset-email',
  RESET_CODE: 'reset-code',
  RESET_PASSWORD: 'reset-password'
};

export default function LoginScreen({
  onSuccess,
  onCancel,
  compact = false,
  title = 'Entrar na Terra Orgânica'
}) {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [purpose, setPurpose] = useState('setup');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const passwordValid = useMemo(
    () => isPasswordFormValid(newPassword, confirmPassword),
    [newPassword, confirmPassword]
  );

  const finishLogin = async (loginEmail, loginPassword) => {
    const result = await authService.login(loginEmail, loginPassword);
    if (onSuccess) onSuccess(result.user);
  };

  const handleContinueEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Atenção', 'Informe seu email.');
      return;
    }

    setLoading(true);
    setInfoMessage('');
    try {
      const result = await authService.checkEmail(trimmed);
      if (!result.exists) {
        Alert.alert('Email não encontrado', 'Este email não está cadastrado.');
        return;
      }

      if (result.needsPasswordSetup) {
        setPurpose('setup');
        await authService.sendCode(trimmed, 'setup');
        setInfoMessage('Enviamos um código de 6 dígitos para seu email. Informe-o abaixo.');
        setStep(STEPS.VERIFY_CODE);
      } else {
        setStep(STEPS.LOGIN);
      }
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível verificar o email.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await finishLogin(email.trim(), password);
    } catch (error) {
      Alert.alert('Erro no login', error.message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await authService.sendCode(email.trim(), purpose);
      Alert.alert('Código reenviado', 'Verifique seu email.');
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível reenviar o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCodeContinue = () => {
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert('Código inválido', 'Informe o código de 6 dígitos recebido por email.');
      return;
    }

    if (purpose === 'setup') {
      setStep(STEPS.SET_PASSWORD);
    } else {
      setStep(STEPS.RESET_PASSWORD);
    }
  };

  const handleConfirmPassword = async () => {
    const validation = validatePasswordPair(newPassword, confirmPassword);
    if (!validation.valid) {
      Alert.alert('Senha inválida', validation.message);
      return;
    }

    setLoading(true);
    try {
      await authService.confirmPassword({
        email: email.trim(),
        code: code.trim(),
        password: newPassword,
        passwordConfirm: confirmPassword,
        purpose
      });
      await finishLogin(email.trim(), newPassword);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível definir a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Atenção', 'Informe seu email.');
      return;
    }

    setLoading(true);
    setPurpose('reset');
    try {
      await authService.sendCode(trimmed, 'reset');
      setInfoMessage('Se o email existir, enviamos um código de verificação.');
      setStep(STEPS.RESET_CODE);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleContinueEmail} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continuar</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setStep(STEPS.RESET_EMAIL)}>
        <Text style={styles.linkText}>Esqueci minha senha</Text>
      </TouchableOpacity>
    </>
  );

  const renderLoginStep = () => (
    <>
      <Text style={styles.helperText}>Entrar como {email.trim()}</Text>
      <PasswordInput
        value={password}
        onChangeText={setPassword}
        placeholder="Senha"
        style={styles.passwordField}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setStep(STEPS.EMAIL)}>
        <Text style={styles.linkText}>Usar outro email</Text>
      </TouchableOpacity>
    </>
  );

  const renderCodeStep = () => (
    <>
      {!!infoMessage && <Text style={styles.infoText}>{infoMessage}</Text>}
      <Text style={styles.label}>Código de verificação</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyCodeContinue}>
        <Text style={styles.primaryButtonText}>Continuar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResendCode} disabled={loading}>
        <Text style={styles.linkText}>Reenviar código</Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <Text style={styles.infoText}>
        {purpose === 'setup'
          ? 'Este é seu primeiro acesso. Defina uma nova senha para continuar.'
          : 'Defina sua nova senha.'}
      </Text>
      <Text style={styles.policyText}>{PASSWORD_POLICY_HINT}</Text>
      <PasswordInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Nova senha"
        style={styles.passwordField}
      />
      <PasswordInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirmar senha"
        style={styles.passwordField}
      />
      <TouchableOpacity
        style={[styles.primaryButton, !passwordValid && styles.primaryButtonDisabled]}
        onPress={handleConfirmPassword}
        disabled={loading || !passwordValid}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Salvar e entrar</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderResetEmailStep = () => (
    <>
      <Text style={styles.helperText}>Informe seu email para redefinir a senha.</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleResetSendCode} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Enviar código</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setStep(STEPS.EMAIL)}>
        <Text style={styles.linkText}>Voltar ao login</Text>
      </TouchableOpacity>
    </>
  );

  let content = null;
  switch (step) {
    case STEPS.LOGIN:
      content = renderLoginStep();
      break;
    case STEPS.VERIFY_CODE:
      content = renderCodeStep();
      break;
    case STEPS.SET_PASSWORD:
    case STEPS.RESET_PASSWORD:
      content = renderPasswordStep();
      break;
    case STEPS.RESET_EMAIL:
      content = renderResetEmailStep();
      break;
    case STEPS.RESET_CODE:
      content = renderCodeStep();
      break;
    default:
      content = renderEmailStep();
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <Text style={styles.title}>{title}</Text>
      {content}
      {onCancel ? (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center'
  },
  compactContainer: {
    paddingVertical: 10
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center'
  },
  label: {
    color: '#ccc',
    marginBottom: 6,
    fontSize: 14
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  passwordField: {
    marginBottom: 12
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12
  },
  primaryButtonDisabled: {
    opacity: 0.5
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  linkText: {
    color: '#8fd694',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14
  },
  helperText: {
    color: '#ccc',
    marginBottom: 12,
    textAlign: 'center'
  },
  infoText: {
    color: '#ddd',
    marginBottom: 12,
    lineHeight: 20
  },
  policyText: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center'
  },
  cancelText: {
    color: '#999',
    fontSize: 14
  }
});
