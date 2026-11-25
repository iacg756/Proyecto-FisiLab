import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { apiRequest } from '../services/apiClient';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState('');
  const [notice, setNotice] = useState('');
  const token = useRef(null);
  const version = useRef(0);
  const pendingRemoval = useRef(null);

  const removeToken = useCallback(() => {
    if (!pendingRemoval.current) {
      pendingRemoval.current = authService.logout().finally(() => {
        pendingRemoval.current = null;
      });
    }
    return pendingRemoval.current;
  }, []);

  const logout = useCallback(async () => {
    // Si falla el almacenamiento, conservamos la sesión para permitir reintentar.
    await removeToken();
    version.current += 1;
    token.current = null;
    setUsuario(null);
    setNotice('');
  }, [removeToken]);

  const restore = useCallback(async () => {
    const operation = ++version.current;
    setRestoring(true);
    setRestoreError('');
    try {
      const saved = await authService.getToken();
      if (version.current !== operation || !saved) return;
      const current = await authService.getMe(saved);
      if (version.current !== operation) return;
      token.current = saved;
      setUsuario(current);
    } catch (error) {
      if (version.current !== operation) return;
      if (error.sessionExpired || error.invalidSession) {
        try {
          await removeToken();
          if (version.current !== operation) return;
          token.current = null;
          setUsuario(null);
          setNotice('Tu sesión ya no es válida. Vuelve a iniciar sesión.');
        } catch {
          setRestoreError('No se pudo borrar la sesión anterior. Intenta nuevamente.');
        }
      } else {
        setRestoreError('No se pudo verificar tu sesión. Revisa tu conexión y vuelve a intentar.');
      }
    } finally {
      if (version.current === operation) setRestoring(false);
    }
  }, [removeToken]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return restore();
    });
    return () => {
      active = false;
      version.current += 1;
    };
  }, [restore]);

  const login = useCallback(async (username, password) => {
    const result = await authService.login(username.trim(), password);
    version.current += 1;
    token.current = result.token;
    setUsuario(result.usuario);
    setNotice('');
  }, []);

  const request = useCallback(
    async (path, options = {}) => {
      const active = token.current;
      const requestVersion = version.current;
      if (!active) throw new Error('Inicia sesión para continuar.');
      try {
        return await apiRequest(path, { ...options, token: active });
      } catch (error) {
        if (error.sessionExpired && version.current === requestVersion) {
          version.current += 1;
          token.current = null;
          setUsuario(null);
          setRestoring(true);
          try {
            await removeToken();
            setNotice('Tu sesión venció. Vuelve a iniciar sesión.');
          } catch {
            setRestoreError('No se pudo borrar la sesión vencida. Intenta nuevamente.');
          } finally {
            setRestoring(false);
          }
        }
        throw error;
      }
    },
    [removeToken],
  );

  return (
    <AuthContext.Provider
      value={{ usuario, restoring, restoreError, notice, restore, login, logout, request }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
