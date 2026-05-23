import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const CACHE_KEY = 'auth_cache';
const CACHE_TTL = 5 * 60 * 1000;
const AUTH_TIMEOUT = 10000;

const getCachedUser = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { user, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return user;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const setCachedUser = (user) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }));
  } catch {}
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getCachedUser());
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(!user && !!localStorage.getItem('token'));
  const loadAttempted = useRef(false);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (!user && !loadAttempted.current) {
        loadAttempted.current = true;
        loadUser();
      } else if (user) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadUser = useCallback(async () => {
    try {
      const source = api.CancelToken?.source();
      const timeoutId = setTimeout(() => source?.cancel?.('Auth timeout'), AUTH_TIMEOUT);
      const res = await api.get('/auth/me/minimal', { cancelToken: source?.token });
      clearTimeout(timeoutId);
      setUser(res.data);
      setCachedUser(res.data);
    } catch {
      setUser(null);
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem('token');
      setToken(null);
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
      loadAttempted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    setCachedUser(res.data.user);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    setCachedUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem(CACHE_KEY);
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const updateUser = (userData) => {
    setUser(prev => {
      const updated = { ...prev, ...userData };
      setCachedUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
