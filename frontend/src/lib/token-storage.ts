import Cookies from 'js-cookie';
import { UserProfile } from '../types/auth';

const ACCESS_TOKEN_KEY = 'simantap_access_token';
const REFRESH_TOKEN_KEY = 'simantap_refresh_token';
const USER_KEY = 'simantap_user';

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return Cookies.get(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken(token: string): void {
    if (typeof window === 'undefined') return;
    Cookies.set(ACCESS_TOKEN_KEY, token, {
      expires: 1 / 96, // 15 minutes
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
    });
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return Cookies.get(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    Cookies.set(REFRESH_TOKEN_KEY, token, {
      expires: 7, // 7 days
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
    });
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user: UserProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  setTokens(accessToken: string, refreshToken: string, user?: UserProfile): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
    if (user) {
      this.setUser(user);
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
