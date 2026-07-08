import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { User } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<any>;
  logout: (portal?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string, remember = false) => {
    const { data } = await api.post('/auth/login', { email, password, remember });
    setUser(data.user);
    return data.user;
  };

  const logout = async (portal?: string) => {
    await api.post('/auth/logout');
    setUser(null);
    const path = window.location.pathname;
    if (portal === 'vet' || path.startsWith('/vet')) {
      window.location.href = '/vet/login';
    } else if (portal === 'marketplace' || path.startsWith('/marketplace')) {
      window.location.href = '/marketplace/login';
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
