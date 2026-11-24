import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../../config/theme';

export default function ActionButton({ title, onPress, loading = false, disabled = false }) {
  const unavailable = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      accessibilityLabel={title}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || unavailable) && styles.dimmed]}
    >
      {loading && <ActivityIndicator color="#FFFFFF" />}
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  dimmed: { opacity: 0.65 },
});
