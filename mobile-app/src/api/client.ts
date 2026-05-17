import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your computer's local IP when testing on a physical device
// For emulators: Android = 10.0.2.2, iOS = localhost
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://srss.ecosdelseo.com';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Refresh automático cuando el server responde 401.
 *
 *   - Llama POST /auth/refresh con el refreshToken guardado.
 *   - Guarda el nuevo accessToken y reintenta el request original.
 *   - Si el refresh falla (refreshToken expirado, revocado), borra la
 *     sesión local — la app verá `user=null` y mandará a /login.
 *   - Si varios requests caen simultáneos con 401, comparten la misma
 *     promesa de refresh para evitar duplicar llamadas.
 */
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!refreshToken) return null;
  try {
    // Llamada raw sin axios.create para evitar bucle del interceptor.
    const res = await axios.post(
      `${API_BASE}/api/v1/auth/refresh`,
      { refreshToken },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    const newAccess = res.data?.data?.accessToken as string | undefined;
    if (!newAccess) return null;
    await SecureStore.setItemAsync('accessToken', newAccess);
    return newAccess;
  } catch {
    return null;
  }
}

async function clearSession() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  await SecureStore.deleteItemAsync('user');
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    // No 401 → propagar tal cual.
    if (status !== 401 || !original) return Promise.reject(error);

    // No reintentar el propio /auth/refresh ni los logins.
    const url = original.url || '';
    if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
      await clearSession();
      return Promise.reject(error);
    }

    // No reintentar más de una vez por request.
    if (original._retried) {
      await clearSession();
      return Promise.reject(error);
    }
    original._retried = true;

    // Compartir la promesa de refresh entre llamadas simultáneas.
    if (!refreshPromise) {
      refreshPromise = tryRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newAccess = await refreshPromise;
    if (!newAccess) {
      await clearSession();
      return Promise.reject(error);
    }

    // Reintentar con el nuevo token.
    original.headers = original.headers || {};
    (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
    return api.request(original);
  }
);

export default api;
export { API_BASE };
