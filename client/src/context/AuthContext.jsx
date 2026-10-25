import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth
  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (e) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('token');
          // Default to Attendee demo user
          await switchToDemo('ATTENDEE');
        }
      } else {
        // Auto sign-in as attendee demo for seamless evaluation
        await switchToDemo('ATTENDEE');
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('token', res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('token', res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const switchToDemo = async (role) => {
    try {
      const res = await api.switchDemoUser(role);
      localStorage.setItem('token', res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      console.error('Failed to switch demo user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'ATTENDEE',
        isAdmin: user?.role === 'ADMIN',
        isOrganizer: user?.role === 'ORGANIZER' || user?.role === 'ADMIN',
        isAttendee: user?.role === 'ATTENDEE',
        tenantId: user?.tenant_id,
        tenantName: user?.tenant_name,
        loading,
        login,
        register,
        logout,
        switchToDemo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
