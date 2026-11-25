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
  async function getMe(token) {
    try {
      return validateUser(await request('/auth/me', { token }));
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        throw Object.assign(new Error('El servidor rechazó tu sesión. Vuelve a iniciar sesión.'), {
          invalidSession: true,
          status: error.status,
        });
      }
      if (error.status) {
        throw Object.assign(
          new Error('El servidor no pudo verificar tu sesión. Intenta nuevamente.'),
          {
            status: error.status,
          },
        );
      }
      throw error;
    }
  }

  return {
    async login(username, password) {
      let result;
      try {
        result = await request('/auth/login', { body: { username, password } });
      } catch (error) {
        // El login muestra mensajes locales para no reproducir datos del formulario.
        const { status } = error;
        if (!status) throw error;
        let message = 'El servidor no pudo iniciar la sesión. Intenta nuevamente.';
        if ([400, 401, 403, 422].includes(status)) {
          message = 'Usuario o contraseña incorrectos.';
        } else if (status === 429) {
          message = 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
        }
        throw Object.assign(new Error(message), { status });
      }
      if (typeof result?.token !== 'string' || !result.token.trim()) {
        throw new Error('El servidor no devolvió una sesión válida.');
      }
      const token = result.token;
      const usuario = await getMe(token);
      try {
        await storage.setToken(token);
      } catch {
        throw new Error('No se pudo guardar tu sesión en el dispositivo. Intenta nuevamente.');
      }
      return { token, usuario };
    },
    getMe,
    getToken: () => storage.getToken(),
    logout: () => storage.removeToken(),
  };
}
