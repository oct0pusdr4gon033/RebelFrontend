import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { EmpleadoDto } from '../api/Dtos/Empleado';

interface AuthState {
  token: string | null;
  empleado: EmpleadoDto | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, empleado: EmpleadoDto) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'rq_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as AuthState;
    } catch {
      // ignore
    }
    return { token: null, empleado: null };
  });

  useEffect(() => {
    if (state.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem('token', state.token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('token');
    }
  }, [state]);

  const login = (token: string, empleado: EmpleadoDto) => {
    setState({ token, empleado });
  };

  const logout = () => {
    setState({ token: null, empleado: null });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isAuthenticated: !!state.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
