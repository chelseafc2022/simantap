import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/api';
import { RefreshTokenResponseData } from '../types/auth';
import { tokenStorage } from './token-storage';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

// State for concurrent token refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Wrapper Refresh Token & Error Interception
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Do not try to refresh if the failed request was login or refresh itself
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If refresh is already in-flight, enqueue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const currentRefreshToken = tokenStorage.getRefreshToken();

      if (!currentRefreshToken) {
        tokenStorage.clear();
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('simantap:unauthorized'));
        }
        return Promise.reject(error);
      }

      try {
        // Call backend refresh token endpoint
        const response = await axios.post<ApiResponse<RefreshTokenResponseData>>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: currentRefreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const newAccessToken = response.data?.data?.accessToken;
        const newRefreshToken = response.data?.data?.refreshToken;
        const updatedUser = response.data?.data?.user;

        if (newAccessToken && newRefreshToken) {
          tokenStorage.setTokens(newAccessToken, newRefreshToken, updatedUser);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Format respon refresh token tidak valid');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clear();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('simantap:unauthorized'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
