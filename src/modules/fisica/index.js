import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APP_SLUG } from '../../config/appConfig';
import { colors, spacing } from '../../config/theme';
import ActionButton from '../../shared/components/ActionButton';
import { useAuth } from '../../shared/context/AuthContext';
import useRemoteData from '../../shared/hooks/useRemoteData';

export function FisicaHomeScreen() {
  const { usuario } = useAuth();
  const { data, loading, error, retry } = useRemoteData(`/contenidos/${APP_SLUG}`);
  const valid = data?.slug === APP_SLUG && Array.isArray(data?.unidades);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Física
      </Text>
      <Text style={styles.body}>Hola, {usuario.nombreCompleto}</Text>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Cargando Física" />
      ) : error ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <ActionButton title="Reintentar" onPress={retry} />
        </>
      ) : !valid ? (
        <>
          <Text style={styles.error}>No se pudo interpretar el contenido de Física.</Text>
          <ActionButton title="Reintentar" onPress={retry} />
        </>
      ) : (
        <>
          {!!data.resumen && <Text style={styles.body}>{data.resumen}</Text>}
          <Text style={styles.heading}>Unidades</Text>
          {data.unidades.length === 0 && <Text>Aún no hay unidades disponibles.</Text>}
          {data.unidades.map((unidad) => (
            <View key={unidad.id} style={styles.card}>
              <Text style={styles.heading}>{unidad.titulo}</Text>
              {!!unidad.descripcion && <Text style={styles.body}>{unidad.descripcion}</Text>}
              {(unidad.lecciones || []).map((leccion) => (
                <Text key={leccion.id} style={styles.body}>
                  {leccion.titulo}
                </Text>
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  heading: { fontSize: 20, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, color: colors.textSecondary, lineHeight: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  error: { color: colors.error },
});
