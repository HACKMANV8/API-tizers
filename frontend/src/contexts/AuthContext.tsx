import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');

      if (storedUser && accessToken) {
        try {
          // Verify token is still valid by fetching profile
          const response = await authApi.getProfile();
          setUser(response.data.data);
          // Update stored user with fresh data
          localStorage.setItem('user', JSON.stringify(response.data.data));
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    try {
      const response = await authApi.login({ emailOrUsername, password });

      if (response.data.success) {
        const { user: userData, tokens } = response.data.data;

        // Store tokens and user data
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);

        toast({
          title: 'Welcome back!',
          description: 'You have been successfully logged in.',
        });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string, fullName?: string) => {
    try {
      const response = await authApi.register({ email, username, password, fullName });

      if (response.data.success) {
        const { user: userData, tokens } = response.data.data;

        // Store tokens and user data
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);

        toast({
          title: 'Account created!',
          description: 'Welcome to Prism!',
        });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast({
        title: 'Registration Failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors, clear local state anyway
      console.error('Logout error:', error);
    }

    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    setUser(null);

    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
