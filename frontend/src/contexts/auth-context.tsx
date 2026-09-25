'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { apiClient } from '../lib/api-client';
import { tokenStorage } from '../lib/token-storage';
import { ApiResponse } from '../types/api';
import { LoginResponseData, UserProfile } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginResponseData) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      if (tokenStorage.getAccessToken()) {
        await apiClient.post('/auth/logout');
      }
    } catch {
      // Ignore error on logout
    } finally {
      tokenStorage.clear();
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
      if (response.data?.data) {
        setUser(response.data.data);
        tokenStorage.setUser(response.data.data);
      }
    } catch {
      // Handled by interceptor if 401
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial hydration from token storage
    const cachedUser = tokenStorage.getUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    // 2. Fetch fresh profile from backend
    refreshProfile();

    // 3. Listen to global unauthorized event dispatched by Axios interceptor
    const handleUnauthorized = () => {
      tokenStorage.clear();
      setUser(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    };

    window.addEventListener('simantap:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('simantap:unauthorized', handleUnauthorized);
    };
  }, [refreshProfile]);

  const login = useCallback((data: LoginResponseData) => {
    tokenStorage.setTokens(data.accessToken, data.refreshToken, data.user);
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
