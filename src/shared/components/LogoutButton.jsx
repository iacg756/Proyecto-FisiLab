import { useRef, useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { colors } from '../../config/theme';
import { useAuth } from '../context/AuthContext';

export default function LogoutButton() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function onPress() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await logout();
    } catch {
      Alert.alert('No se pudo cerrar sesión', 'Intenta nuevamente.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      accessibilityState={{ disabled: busy }}
      style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }}
    >
      <Text style={{ color: colors.primary }}>{busy ? 'Saliendo…' : 'Salir'}</Text>
    </Pressable>
  );
}
