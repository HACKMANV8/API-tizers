import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10);

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/auth';
          return Promise.reject(error);
        }

        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data.data.tokens;

        // Save new access token
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth data and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API response type
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Error response type
export interface ApiError {
  success: false;
  message: string;
  error?: string;
  errors?: any[];
}

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; password: string; fullName?: string }) =>
    api.post<ApiResponse>('/auth/register', data),

  login: (data: { emailOrUsername: string; password: string }) =>
    api.post<ApiResponse>('/auth/login', data),

  logout: () =>
    api.post<ApiResponse>('/auth/logout'),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse>('/auth/refresh', { refreshToken }),

  getProfile: () =>
    api.get<ApiResponse>('/auth/profile'),
};

// User API
export const userApi = {
  getActivity: (limit?: number) =>
    api.get<ApiResponse>('/users/activity', { params: { limit } }),

  getStats: () =>
    api.get<ApiResponse>('/users/stats'),

  getPlatforms: () =>
    api.get<ApiResponse>('/users/platforms'),
};

// Leaderboard API
export const leaderboardApi = {
  getLeaderboard: (period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' = 'ALL_TIME', limit: number = 100) =>
    api.get<ApiResponse>('/leaderboard', { params: { period, limit } }),

  getUserRank: (userId: string, period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' = 'ALL_TIME') =>
    api.get<ApiResponse>(`/leaderboard/user/${userId}`, { params: { period } }),

  refreshLeaderboard: (period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' = 'ALL_TIME') =>
    api.post<ApiResponse>('/leaderboard/refresh', { period }),
};

// Platforms API
export const platformsApi = {
  connectPlatform: (platform: string, data: { username?: string; accessToken?: string; platformUserId?: string; instanceUrl?: string }) =>
    api.post<ApiResponse>(`/platforms/connect/${platform}`, data),

  disconnectPlatform: (platform: string) =>
    api.delete<ApiResponse>(`/platforms/disconnect/${platform}`),

  syncPlatform: (platform: string) =>
    api.put<ApiResponse>(`/platforms/sync/${platform}`),

  getPlatformStatus: (platform: string) =>
    api.get<ApiResponse>(`/platforms/${platform}/status`),

  // OpenProject specific
  getOpenProjectProjects: () =>
    api.get<ApiResponse>(`/platforms/openproject/projects`),

  getProjectWorkPackages: (projectId: string) =>
    api.get<ApiResponse>(`/platforms/openproject/projects/${projectId}/work-packages`),
};

export default api;
