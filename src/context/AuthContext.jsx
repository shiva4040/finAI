import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialUser } from '../data/mockData';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('finai_auth_user');
      return stored ? JSON.parse(stored) : initialUser;
    } catch {
      return initialUser;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const token = localStorage.getItem('finai_token');
      return token !== 'null' && token !== null;
    } catch {
      return true; // Default to true for smooth exploration
    }
  });

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('finai_auth_user', JSON.stringify(user));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const login = async (email, password, rememberMe = true) => {
    if (!email || !password) {
      throw new Error('Please enter both email and password');
    }

    try {
      const res = await authApi.login(email, password, rememberMe);
      if (res?.tokens) {
        apiClient.setTokens(res.tokens.access_token, res.tokens.refresh_token);
        const authedUser = {
          ...initialUser,
          ...res.user,
        };
        setUser(authedUser);
        setIsAuthenticated(true);
        return authedUser;
      }
    } catch (apiErr) {
      console.warn('Backend login attempt unsuccessful, using local fallback:', apiErr.message);
    }

    const authenticatedUser = {
      ...initialUser,
      email: email,
      name: email.split('@')[0] ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) : 'Shiva',
    };

    setUser(authenticatedUser);
    setIsAuthenticated(true);
    if (rememberMe) {
      localStorage.setItem('finai_token', 'mock_jwt_token_finai_2026');
      localStorage.setItem('finai_auth_user', JSON.stringify(authenticatedUser));
    }
    return authenticatedUser;
  };

  const signup = async ({ name, email, password }) => {
    if (!name || !email || !password) {
      throw new Error('All fields are required');
    }

    try {
      const res = await authApi.register(name, email, password);
      if (res?.tokens) {
        apiClient.setTokens(res.tokens.access_token, res.tokens.refresh_token);
        const newUser = {
          ...initialUser,
          ...res.user,
          fullName: name,
        };
        setUser(newUser);
        setIsAuthenticated(true);
        return newUser;
      }
    } catch (apiErr) {
      console.warn('Backend register attempt unsuccessful, using local fallback:', apiErr.message);
    }

    const newUser = {
      ...initialUser,
      name: name.split(' ')[0] || 'User',
      fullName: name,
      email: email,
    };
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('finai_token', 'mock_jwt_token_finai_2026');
    localStorage.setItem('finai_auth_user', JSON.stringify(newUser));
    return newUser;
  };

  const updateProfile = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('finai_auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    try {
      const refreshToken = apiClient.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (e) {
      console.warn('Backend logout failed:', e);
    } finally {
      setIsAuthenticated(false);
      apiClient.clearTokens();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
