import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialUser } from '../data/mockData';

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

  const login = (email, password, rememberMe = true) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!email || !password) {
          reject(new Error('Please enter both email and password'));
          return;
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
        resolve(authenticatedUser);
      }, 500);
    });
  };

  const signup = ({ name, email, password }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!name || !email || !password) {
          reject(new Error('All fields are required'));
          return;
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
        resolve(newUser);
      }, 600);
    });
  };

  const updateProfile = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('finai_auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('finai_token');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
