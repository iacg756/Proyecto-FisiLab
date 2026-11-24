import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME } from '../../config/appConfig';
import { colors, spacing } from '../../config/theme';
import ActionButton from '../../shared/components/ActionButton';
import { useAuth } from '../../shared/context/AuthContext';

export default function LoginScreen() {
  const { login, notice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const passwordInput = useRef(null);
  async function submit() {
    if (sending.current) return;
    if (!username.trim() || !password.trim()) {
      setError('Ingresa tu usuario y contraseña.');
      return;
    }
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      setPassword('');
    } catch (error) {
      setError(error.message || 'No se pudo iniciar sesión. Intenta nuevamente.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.form}>
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.subtitle}>Tu espacio para aprender Física</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Iniciar sesión
            </Text>
            {!!notice && (
              <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
                {notice}
              </Text>
            )}
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              accessibilityLabel="Usuario"
              style={styles.input}
              placeholder="Tu usuario"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordInput.current?.focus()}
              editable={!busy}
            />
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              ref={passwordInput}
              accessibilityLabel="Contraseña"
              style={styles.input}
              placeholder="Tu contraseña"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              editable={!busy}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onPress={() => setVisible(!visible)}
              style={styles.visibility}
            >
              <Text style={{ color: colors.primary }}>
                {visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              </Text>
            </Pressable>
            {!!error && (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            )}
            <ActionButton
              title={busy ? 'Ingresando…' : 'Ingresar'}
              loading={busy}
              onPress={submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  form: {
    width: '100%',
    maxWidth: 440,
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 20,
  },
  brand: { fontSize: 34, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  visibility: { minHeight: 48, justifyContent: 'center' },
  error: { color: colors.error, fontSize: 16, marginBottom: spacing.sm },
});
