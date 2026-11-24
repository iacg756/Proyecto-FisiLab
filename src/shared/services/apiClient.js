import { API_BASE_URL } from '../../config/apiConfig';

export function createApiClient({ baseURL = API_BASE_URL, fetchImpl = fetch } = {}) {
  return async function request(path, { token, body, signal } = {}) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort);
    const timeout = setTimeout(abort, 45000);
    try {
      const response = await fetchImpl(`${baseURL}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload?.message || `No se pudo completar la solicitud (${response.status}).`;
        throw Object.assign(new Error(message), {
          status: response.status,
          sessionExpired:
            response.status === 401 ||
            (response.status === 403 &&
              /token.*(inválido|invalido|no es válido|no es valido|expir|venc)|jwt.*(expired|invalid)/i.test(
                `${payload?.error || ''} ${message}`,
              )),
        });
      }
      if (payload?.status !== 'success' || !Object.hasOwn(payload, 'data')) {
        throw new Error('El servidor devolvió una respuesta no válida.');
      }
      return payload.data;
    } catch (error) {
      if (error.status) throw error;
      if (controller.signal.aborted) {
        throw new Error('La solicitud se interrumpió o tardó demasiado. Intenta nuevamente.');
      }
      throw new Error(
        'No se pudo obtener una respuesta válida. Revisa tu conexión e intenta nuevamente.',
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
}

export const apiRequest = createApiClient();
