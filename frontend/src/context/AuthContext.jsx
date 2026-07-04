import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mayzax_token'));
  const [loading, setLoading] = useState(true);

  // Memoized logout so it can be safely used in dependency arrays and event listeners
  const logout = useCallback(() => {
    localStorage.removeItem('mayzax_token');
    localStorage.removeItem('mayzax_user');
    setToken(null);
    setUser(null);
  }, []);

  // 1. Verify session with the backend on boot
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('mayzax_token');
      
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Fetch fresh state. Our client.js already injects the Bearer token.
        const response = await client.get('/auth/profile');
        const freshUser = response.data.data.user;
        
        if (!isMounted) return;

        setUser(freshUser);
        // Keep local storage in sync with fresh DB state
        localStorage.setItem('mayzax_user', JSON.stringify(freshUser));
      } catch (error) {
        // If the token is invalid, expired, or user is inactive, clear everything
        console.error('Session verification failed on boot:', error);
        if (isMounted) logout();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // 2. Listen for the global 401/403 event emitted by our Axios interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      console.warn('Session expired event received. Logging out.');
      logout();
    };

    window.addEventListener('mayzax-session-expired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('mayzax-session-expired', handleSessionExpired);
    };
  }, [logout]);

  const login = async (email, password) => {
    const response = await client.post('/auth/login', { email, password });
    
    // PRODUCTION FIX: Unpack the double-nested Axios + API standard envelope
    const { token: jwtToken, user: userData } = response.data.data;
    
    localStorage.setItem('mayzax_token', jwtToken);
    localStorage.setItem('mayzax_user', JSON.stringify(userData));
    
    setToken(jwtToken);
    setUser(userData);
    
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
