import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints';

/**
 * Keeps track of "who is logged in" for the whole app.
 * On page load it asks the backend (/auth/me) — the httpOnly cookie is the real proof,
 * so refreshing the page keeps you logged in without storing the token in JavaScript.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((data) => active && setUser(data.user))
      .catch(() => active && setUser(null))
      .finally(() => active && setInitializing(false));
    return () => {
      active = false;
    };
  }, []);

  // Any 401 from the API (expired/invalid session) logs the user out locally.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('odts:unauthorized', onUnauthorized);
    return () => window.removeEventListener('odts:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const data = await authApi.register(form);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, setUser }),
    [user, initializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
