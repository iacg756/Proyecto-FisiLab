/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { createLoader } = require('./loadSource.cjs');

const load = createLoader();
const { createApiClient } = load('src/shared/services/apiClient.js');
const { createAuthService } = load('src/shared/services/authService.js');
const { getSessionRoute } = load('src/config/roles.js');
const { APP_SLUG } = load('src/config/appConfig.js');
const response = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});
function storage() {
  let saved = null;
  return {
    getToken: async () => saved,
    setToken: async (token) => {
      saved = token;
    },
    removeToken: async () => {
      saved = null;
    },
  };
}

for (const [rol, expected] of [
  ['ESTUDIANTE', 'Fisica'],
  ['DOCENTE', 'Docente'],
]) {
  test(`login ${rol}: contrato real, token y destino`, async () => {
    const calls = [];
    const request = createApiClient({
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        const data = url.endsWith('/auth/login')
          ? { token: 'test-token', usuario: { id: 2, rol: 'ADMIN' } }
          : { id: 2, rol };
        return response(200, { status: 'success', data });
      },
    });
    const saved = storage();
    const service = createAuthService(request, saved);
    const result = await service.login('usuario', 'clave');
    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.endsWith('/api/auth/login'));
    assert.equal(calls[0].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].options.body), { username: 'usuario', password: 'clave' });
    assert.equal(calls[0].options.headers.Authorization, undefined);
    assert.ok(calls[1].url.endsWith('/api/auth/me'));
    assert.equal(calls[1].options.method, 'GET');
    assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token');
    assert.equal(calls[1].options.body, undefined);
    assert.equal(await saved.getToken(), 'test-token');
    assert.equal(getSessionRoute(result.usuario), expected);
  });
}

test('restaurar consulta /auth/me con Bearer; cerrar sesión elimina token', async () => {
  const saved = storage();
  await saved.setToken('saved-token');
  const service = createAuthService(
    createApiClient({
      fetchImpl: async (url, options) => {
        assert.ok(url.endsWith('/auth/me'));
        assert.equal(options.headers.Authorization, 'Bearer saved-token');
        return response(200, { status: 'success', data: { id: 1, rol: 'DOCENTE' } });
      },
    }),
    saved,
  );
  assert.equal((await service.getMe(await service.getToken())).rol, 'DOCENTE');
  await service.logout();
  assert.equal(await service.getToken(), null);
});

test('credenciales rechazadas no guardan token ni exponen contraseña', async () => {
  const saved = storage();
  const service = createAuthService(
    createApiClient({
      fetchImpl: async () => response(401, { message: 'Contraseña: secreto' }),
    }),
    saved,
  );
  await assert.rejects(
    service.login('usuario', 'secreto'),
    (error) => error.status === 401 && error.message === 'Usuario o contraseña incorrectos.',
  );
  assert.equal(await saved.getToken(), null);
});

test('rol no permitido y token vacío no producen una sesión', async () => {
  for (const data of [
    { token: 'test', usuario: { rol: 'ADMIN' } },
    { token: '', usuario: { rol: 'ESTUDIANTE' } },
  ]) {
    const saved = storage();
    const request = async (url) => (url === '/auth/login' ? data : data.usuario);
    await assert.rejects(createAuthService(request, saved).login('u', 'p'));
    assert.equal(await saved.getToken(), null);
  }
});

test('JWT rechazado por /auth/me no permite iniciar ni recuperar sesión', async () => {
  for (const status of [401, 403]) {
    const saved = storage();
    const request = createApiClient({
      fetchImpl: async (url) =>
        url.endsWith('/auth/login')
          ? response(200, { status: 'success', data: { token: 'rejected-token' } })
          : response(status, { message: 'No autorizado' }),
    });
    const service = createAuthService(request, saved);
    await assert.rejects(service.login('usuario', 'clave'), { invalidSession: true, status });
    assert.equal(await saved.getToken(), null);
    await assert.rejects(service.getMe('rejected-token'), { invalidSession: true, status });
  }
});

test('logout y vencimiento simultáneos comparten un solo borrado del JWT', async () => {
  const deletion = Promise.withResolvers();
  let deletions = 0;
  const loadProvider = createLoader({
    react: {
      createContext: () => ({ Provider: 'AuthProvider' }),
      useCallback: (callback) => callback,
      useEffect: () => {},
      useRef: (current) => ({ current }),
      useState: (value) => [value, () => {}],
    },
    [path.resolve(__dirname, '../src/shared/services/auth.js')]: {
      authService: {
        login: async () => ({ token: 't', usuario: { rol: 'ESTUDIANTE' } }),
        logout: () => {
          deletions += 1;
          return deletion.promise;
        },
      },
    },
    [path.resolve(__dirname, '../src/shared/services/apiClient.js')]: {
      apiRequest: async () => {
        throw Object.assign(new Error('Sesión vencida'), { sessionExpired: true });
      },
    },
  });
  const { AuthProvider } = loadProvider('src/shared/context/AuthContext.jsx');
  const auth = AuthProvider({}).props.value;
  await auth.login('usuario', 'clave');
  const logout = auth.logout();
  const request = assert.rejects(auth.request('/contenidos/fisica'), { sessionExpired: true });
  await Promise.resolve();
  deletion.resolve();
  await Promise.all([logout, request]);
  assert.equal(deletions, 1);
  await assert.rejects(auth.request('/contenidos/fisica'), /Inicia sesión/);
});

test('fallo al guardar token no devuelve un login exitoso', async () => {
  const saved = storage();
  saved.setToken = async () => {
    throw new Error('storage unavailable');
  };
  const request = async (url) => (url === '/auth/login' ? { token: 't' } : { rol: 'ESTUDIANTE' });
  await assert.rejects(createAuthService(request, saved).login('u', 'p'), /guardar tu sesión/);
});

test('401 vence sesión, 403 de permisos no la vence', async () => {
  for (const [status, message, expired] of [
    [401, 'Token vencido', true],
    [403, 'Sin permiso para este curso', false],
    [403, 'Token inválido', true],
    [403, 'El token proporcionado no es válido', true],
  ]) {
    const request = createApiClient({ fetchImpl: async () => response(status, { message }) });
    await assert.rejects(
      request('/docente/cursos', { token: 't' }),
      (error) => error.sessionExpired === expired,
    );
  }
});

test('red caída no invalida sesión y el error no expone credenciales', async () => {
  const request = createApiClient({
    fetchImpl: async () => {
      throw new Error('password=secreto');
    },
  });
  await assert.rejects(
    request('/auth/me', { token: 't' }),
    (error) => !error.sessionExpired && !error.message.includes('secreto'),
  );
});

test('respuesta inválida se rechaza', async () => {
  const request = createApiClient({
    fetchImpl: async () => response(200, { token: 'sin-envelope' }),
  });
  await assert.rejects(request('/auth/login'));
});

test('peticiones canceladas se abortan', async () => {
  const controller = new AbortController();
  controller.abort();
  const request = createApiClient({
    fetchImpl: async (url, options) => {
      assert.equal(options.signal.aborted, true);
      throw new Error('aborted');
    },
  });
  await assert.rejects(request('/contenidos/fisica', { signal: controller.signal }), /interrumpió/);
});

test('sin usuario y con rol desconocido no se habilitan pantallas privadas', () => {
  assert.equal(getSessionRoute(null), 'Login');
  assert.equal(getSessionRoute({ rol: 'ADMIN' }), 'SinAcceso');
  assert.equal(APP_SLUG, 'fisica');
});

test('cada navegador registra únicamente las rutas de su rol', () => {
  const roles = {};
  const contextPath = path.resolve(__dirname, '../src/shared/context/AuthContext.jsx');
  const native = new Proxy(
    {},
    { get: (_, name) => (name === 'StyleSheet' ? { create: (styles) => styles } : name) },
  );
  const overrides = {
    [contextPath]: { useAuth: () => roles.current },
    'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@react-navigation/native-stack': {
      createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }),
    },
  };
  const loader = createLoader(overrides);
  // Inspecciona los árboles JSX reales, sin ejecutar módulos nativos.
  const student = loader('src/navigation/StudentNavigator.jsx').default();
  const teacher = loader('src/navigation/TeacherNavigator.jsx').default();
  assert.equal(student.props.children.props.name, 'Fisica');
  assert.equal(teacher.props.children.props.name, 'Docente');
  const root = loader('src/navigation/AppNavigator.jsx').default;
  for (const [usuario, component] of [
    [null, 'AuthNavigator'],
    [{ id: 2, rol: 'ESTUDIANTE' }, 'StudentNavigator'],
    [{ id: 1, rol: 'DOCENTE' }, 'TeacherNavigator'],
    [{ id: 3, rol: 'ADMIN' }, 'InvalidRole'],
  ]) {
    roles.current = { usuario, restoring: false, restoreError: '' };
    assert.equal(root().type.name, component);
  }
  roles.current = { usuario: { rol: 'ESTUDIANTE' }, restoring: true };
  assert.equal(root().type, 'View');
});

test('el adaptador nativo guarda solo el token y lo elimina al salir', async () => {
  const values = new Map();
  const loader = createLoader({
    'react-native': { Platform: { OS: 'android' } },
    'expo-secure-store': {
      getItemAsync: async (key) => values.get(key) || null,
      setItemAsync: async (key, value) => values.set(key, value),
      deleteItemAsync: async (key) => values.delete(key),
    },
    [path.resolve(__dirname, '../src/shared/services/apiClient.js')]: {
      apiRequest: async (url) =>
        url === '/auth/login' ? { token: 'test-native-token' } : { id: 2, rol: 'ESTUDIANTE' },
    },
  });
  const { authService } = loader('src/shared/services/auth.js');
  await authService.login('usuario', 'clave');
  assert.deepEqual([...values], [['fisilab_session', 'test-native-token']]);
  assert.equal(await authService.getToken(), 'test-native-token');
  await authService.logout();
  assert.equal(await authService.getToken(), null);
});
