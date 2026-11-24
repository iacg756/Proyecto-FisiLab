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
        return response(200, {
          status: 'success',
          data: { token: 'test-token', usuario: { id: 2, rol } },
        });
      },
    });
    const saved = storage();
    const service = createAuthService(request, saved);
    const result = await service.login('usuario', 'clave');
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.endsWith('/api/auth/login'));
    assert.equal(calls[0].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].options.body), { username: 'usuario', password: 'clave' });
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
      fetchImpl: async () => response(401, { message: 'Credenciales incorrectas' }),
    }),
    saved,
  );
  await assert.rejects(
    service.login('usuario', 'secreto'),
    (error) => error.status === 401 && !error.message.includes('secreto'),
  );
  assert.equal(await saved.getToken(), null);
});

test('rol no permitido y token vacío no producen una sesión', async () => {
  for (const data of [
    { token: 'test', usuario: { rol: 'ADMIN' } },
    { token: '', usuario: { rol: 'ESTUDIANTE' } },
  ]) {
    const saved = storage();
    await assert.rejects(createAuthService(async () => data, saved).login('u', 'p'));
    assert.equal(await saved.getToken(), null);
  }
});

test('fallo al guardar token no devuelve un login exitoso', async () => {
  const saved = storage();
  saved.setToken = async () => {
    throw new Error('storage unavailable');
  };
  await assert.rejects(
    createAuthService(async () => ({ token: 't', usuario: { rol: 'ESTUDIANTE' } }), saved).login(
      'u',
      'p',
    ),
  );
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
      apiRequest: async () => ({
        token: 'test-native-token',
        usuario: { id: 2, rol: 'ESTUDIANTE' },
      }),
    },
  });
  const { authService } = loader('src/shared/services/auth.js');
  await authService.login('usuario', 'clave');
  assert.deepEqual([...values], [['fisilab_session', 'test-native-token']]);
  assert.equal(await authService.getToken(), 'test-native-token');
  await authService.logout();
  assert.equal(await authService.getToken(), null);
});
