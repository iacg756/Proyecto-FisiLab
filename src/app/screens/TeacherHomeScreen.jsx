import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../config/theme';
import ActionButton from '../../shared/components/ActionButton';
import { useAuth } from '../../shared/context/AuthContext';
import useRemoteData from '../../shared/hooks/useRemoteData';

export default function TeacherHomeScreen() {
  const { usuario } = useAuth();
  const { data, loading, error, retry } = useRemoteData('/docente/cursos');
  const cursos = Array.isArray(data) ? data : data?.cursos;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Panel docente
      </Text>
      <Text style={styles.body}>Hola, {usuario.nombreCompleto}</Text>
      <Text style={styles.body}>Cursos asignados · Solo lectura</Text>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Cargando cursos" />
      ) : error ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <ActionButton title="Reintentar" onPress={retry} />
        </>
      ) : !Array.isArray(cursos) ? (
        <>
          <Text style={styles.error}>No se pudo interpretar la lista de cursos.</Text>
          <ActionButton title="Reintentar" onPress={retry} />
        </>
      ) : cursos.length === 0 ? (
        <Text>No tienes cursos asignados.</Text>
      ) : (
        cursos.map((curso) => (
          <View key={curso.id} style={styles.card}>
            <Text style={styles.course}>{curso.nombre}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, color: colors.textSecondary },
  course: { fontSize: 18, fontWeight: '600', color: colors.text },
  card: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: 12 },
  error: { color: colors.error },
});
