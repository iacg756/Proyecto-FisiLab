import { getSessionRoute } from '../../config/roles';

function validateUser(usuario) {
  if (!usuario || getSessionRoute(usuario) === 'SinAcceso') {
    throw Object.assign(new Error('Tu cuenta no tiene un rol habilitado en FisiLab.'), {
      invalidSession: true,
    });
  }
  return usuario;
}

// Dependencias explícitas para reutilizar el servicio y probarlo sin un dispositivo.
export function createAuthService(request, storage) {
  return {
    async login(username, password) {
      const result = await request('/auth/login', { body: { username, password } });
      const usuario = validateUser(result?.usuario);
      if (typeof result?.token !== 'string' || !result.token.trim()) {
        throw new Error('El servidor no devolvió una sesión válida.');
      }
      await storage.setToken(result.token);
      return { token: result.token, usuario };
    },
    async getMe(token) {
      const result = await request('/auth/me', { token });
      return validateUser(result);
    },
    getToken: () => storage.getToken(),
    logout: () => storage.removeToken(),
  };
}
