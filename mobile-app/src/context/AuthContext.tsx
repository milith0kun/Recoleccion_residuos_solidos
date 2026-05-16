import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  dni: string;
  zone?: string;
  phone?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isOperator: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  getActiveExecutionId: () => Promise<string | null>;
  setActiveExecutionId: (id: string | null) => Promise<void>;
}

const ACTIVE_EXECUTION_KEY = 'activeExecutionId';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync('accessToken');
        const savedUser = await SecureStore.getItemAsync('user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser) as User);
        }
      } catch (e) {
        if (__DEV__) console.warn('[auth] error loading session', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!data.success) throw new Error(data.error?.message || 'Error de login');

    await SecureStore.setItemAsync('accessToken', data.data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.data.refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(data.data.user));
    setToken(data.data.accessToken);
    setUser(data.data.user as User);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const { data } = await api.post('/auth/google', { idToken });
    if (!data.success) throw new Error(data.error?.message || 'Error de login con Google');

    await SecureStore.setItemAsync('accessToken', data.data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.data.refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(data.data.user));
    setToken(data.data.accessToken);
    setUser(data.data.user as User);
  }, []);

  const register = useCallback(async (formData: Record<string, string>) => {
    const { data } = await api.post('/auth/register', formData);
    if (!data.success) throw new Error(data.error?.message || 'Error de registro');

    await SecureStore.setItemAsync('accessToken', data.data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.data.refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(data.data.user));
    setToken(data.data.accessToken);
    setUser(data.data.user as User);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync(ACTIVE_EXECUTION_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const getActiveExecutionId = useCallback(async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(ACTIVE_EXECUTION_KEY);
    } catch (e) {
      if (__DEV__) console.warn('[auth] error reading active execution', e);
      return null;
    }
  }, []);

  const setActiveExecutionId = useCallback(async (id: string | null): Promise<void> => {
    try {
      if (id) {
        await SecureStore.setItemAsync(ACTIVE_EXECUTION_KEY, id);
      } else {
        await SecureStore.deleteItemAsync(ACTIVE_EXECUTION_KEY);
      }
    } catch (e) {
      if (__DEV__) console.warn('[auth] error writing active execution', e);
    }
  }, []);

  const isOperator = useMemo(
    () => user?.role === 'operator' || user?.role === 'admin',
    [user?.role]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isOperator,
        login,
        loginWithGoogle,
        register,
        logout,
        getActiveExecutionId,
        setActiveExecutionId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
