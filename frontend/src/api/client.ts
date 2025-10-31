/**
 * API Client
 *
 * Axios-based client for communicating with the Prism backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(email: string, username: string, password: string) {
    const response = await this.client.post('/auth/register', {
      email,
      username,
      password,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  // User endpoints
  async getCurrentUser() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async updateProfile(data: { username?: string; email?: string }) {
    const response = await this.client.put('/users/me', data);
    return response.data;
  }

  // Leaderboard endpoints
  async getLeaderboard(params?: { limit?: number; offset?: number; platform?: string }) {
    const response = await this.client.get('/leaderboard', { params });
    return response.data;
  }

  // Accounts endpoints
  async getAccounts() {
    const response = await this.client.get('/accounts');
    return response.data;
  }

  async linkAccount(platform: string, accountId: string, config?: any) {
    const response = await this.client.post('/accounts', {
      platform,
      accountId,
      config,
    });
    return response.data;
  }

  async deleteAccount(accountId: string) {
    const response = await this.client.delete(`/accounts/${accountId}`);
    return response.data;
  }

  // Snapshots endpoints
  async getSnapshots(userId: string, params?: { platform?: string; limit?: number }) {
    const response = await this.client.get(`/snapshots/${userId}`, { params });
    return response.data;
  }

  // Projects endpoints
  async getProjects() {
    const response = await this.client.get('/projects');
    return response.data;
  }

  async createProject(data: { name: string; description?: string; config?: any }) {
    const response = await this.client.post('/projects', data);
    return response.data;
  }

  // Streaks endpoints
  async getStreaks(userId: string, params?: { startDate?: string; endDate?: string }) {
    const response = await this.client.get(`/streaks/${userId}`, { params });
    return response.data;
  }

  async recordActivity(activityType: string, metadata?: any) {
    const response = await this.client.post('/streaks', {
      activityType,
      metadata,
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
