import axios from 'axios';
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
