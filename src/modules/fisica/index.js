import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APP_SLUG } from '../../config/appConfig';
import { colors, spacing } from '../../config/theme';
import ActionButton from '../../shared/components/ActionButton';
import { useAuth } from '../../shared/context/AuthContext';
import useRemoteData from '../../shared/hooks/useRemoteData';
import { useNavigation } from '@react-navigation/native';

export function FisicaHomeScreen() {
  const navigation = useNavigation();
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
              <View style={styles.unidadHeader}>
                <Text style={styles.tituloUnidad}>
                  {unidad.titulo}
                </Text>

                <Text style={styles.estadoUnidad}>
                  {unidad.estado === 'ESTUDIADO'
                    ? 'Completada'
                    : 'En progreso'}
                </Text>
              </View>

              {!!unidad.descripcion && (
                <Text style={styles.body}>
                  {unidad.descripcion}
                </Text>
              )}

              {(unidad.lecciones || []).length === 0 ? (
                <Text style={styles.body}>
                  No hay lecciones disponibles.
                </Text>
              ) : (
                (unidad.lecciones || []).map((leccion) => (
                <Pressable
                  key={leccion.id}
                  style={({ pressed }) => [
                    styles.leccion,
                    pressed && styles.leccionPresionada,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir lección ${leccion.titulo}`}
                  onPress={() => navigation.navigate('LeccionDetalle', {
                    leccionId: leccion.id,
                  })}
                >
                  <View style={styles.leccionContenido}>
                    <Text style={styles.nombreLeccion}>
                      {leccion.titulo}
                    </Text>

                    <Text
                      style={
                        leccion.estado === 'ESTUDIADO'
                          ? styles.estudiado
                          : styles.pendiente
                      }
                    >
                      {leccion.estado === 'ESTUDIADO'
                        ? 'Estudiado'
                        : 'Pendiente'}
                    </Text>
                  </View>

                  <Text style={styles.flecha}>›</Text>
                </Pressable>
                ))
              )}
            </View>
          ))}

        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },

  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },

  body: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },

  error: {
    color: colors.error,
  },

  unidadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  estadoUnidad: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },

  leccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  leccionContenido: {
    flex: 1,
    gap: spacing.xs,
  },

  nombreLeccion: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  estudiado: {
    fontSize: 16,
    color: '#15803D',
    fontWeight: '600',
  },

  pendiente: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  tituloUnidad: {
  flex: 1,
  fontSize: 20,
  fontWeight: '600',
  color: colors.text,
  },

  leccionPresionada: {
    opacity: 0.6,
  },

  flecha: {
    fontSize: 28,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
});
