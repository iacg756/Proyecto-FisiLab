import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '../config/appConfig';
import { getSessionRoute } from '../config/roles';
import { colors, spacing } from '../config/theme';
import ActionButton from '../shared/components/ActionButton';
import { useAuth } from '../shared/context/AuthContext';
import AuthNavigator from './AuthNavigator';
import StudentNavigator from './StudentNavigator';
import TeacherNavigator from './TeacherNavigator';

export default function AppNavigator() {
  const { usuario, restoring, restoreError, restore, logout } = useAuth();
  if (restoring || restoreError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{APP_NAME}</Text>
        {restoring ? (
          <>
            <ActivityIndicator
              size="large"
              color={colors.primary}
              accessibilityLabel="Verificando sesión"
            />
            <Text>Verificando tu sesión…</Text>
          </>
        ) : (
          <>
            <Text accessibilityRole="alert">{restoreError}</Text>
            <ActionButton title="Reintentar" onPress={restore} />
          </>
        )}
      </View>
    );
  }
  // Solo se monta el navegador autorizado; cambiar de sesión descarta su historial.
  const route = getSessionRoute(usuario);
  if (route === 'Login') return <AuthNavigator key="login" />;
  if (route === 'Fisica') return <StudentNavigator key={`estudiante-${usuario.id}`} />;
  if (route === 'Docente') return <TeacherNavigator key={`docente-${usuario.id}`} />;
  return <InvalidRole onLogout={logout} />;
}

function InvalidRole({ onLogout }) {
  const [error, setError] = useState('');
  return (
    <View style={styles.container}>
      <Text>Tu cuenta no tiene un rol habilitado.</Text>
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      <ActionButton
        title="Volver al login"
        onPress={() =>
          onLogout().catch(() => setError('No se pudo cerrar la sesión. Intenta nuevamente.'))
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
});
