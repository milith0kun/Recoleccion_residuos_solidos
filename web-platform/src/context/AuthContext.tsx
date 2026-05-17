'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface ZoneRef {
  _id: string;
  name?: string;
  color?: string;
  district?: string;
}

export interface User {
  id: string;
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'citizen' | 'driver' | 'operator' | 'admin';
  dni?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  zone?: string | ZoneRef | null;
  profileComplete?: boolean;
  isVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isDriver: boolean;
  isCitizen: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      try {
        const savedToken = localStorage.getItem('accessToken');
        const savedUser = localStorage.getItem('user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error('Error initializing auth:', e);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Error de autenticación');

    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setToken(data.data.accessToken);
    setUser(data.data.user);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const res = await fetch('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Error de autenticación con Google');

    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setToken(data.data.accessToken);
    setUser(data.data.user);
  }, []);

  const register = useCallback(async (formData: Record<string, string>) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Error de registro');

    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setToken(data.data.accessToken);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((next: User) => {
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  }, []);

  const { isAdmin, isOperator, isDriver, isCitizen } = useMemo(
    () => ({
      isAdmin: user?.role === 'admin',
      // operator = planificador (supervisor de operaciones).
      isOperator: user?.role === 'operator' || user?.role === 'admin',
      isDriver: user?.role === 'driver' || user?.role === 'operator' || user?.role === 'admin',
      isCitizen: user?.role === 'citizen',
    }),
    [user?.role]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isOperator,
        isDriver,
        isCitizen,
        login,
        loginWithGoogle,
        register,
        logout,
        setUser: updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
