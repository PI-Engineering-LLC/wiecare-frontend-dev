import React, { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const activeClientId = localStorage.getItem('activeClientId');

  // ── Current User Profile Query ──────────────────────────────────
  const { 
    data: user = null, 
    isLoading: loading, 
    error: rawError 
  } = useQuery({
    queryKey: ['authUser', activeClientId],
    queryFn: async () => {
      try {
        const data = await api.me();
        
        // Handle post-login redirection safely within the query function lifecycle
        if (window.location.pathname === '/login' || window.location.pathname.startsWith('/mfa-')) {
          window.location.href = '/';
        }
        return data;
      } catch (error) {
        // Clear metadata state when core auth entirely crashes
        localStorage.removeItem('activeClientId');
        throw error;
      }
    },
    retry: false, // Prevents cascading retries when user is unauthenticated
    staleTime: 1000 * 60 * 5, // 5 minutes cache validity
  });

  // ── Derive Errors and Auth States ───────────────────────────────
  const authError = useMemo(() => {
    if (!rawError) return null;
    const msg = rawError.message || '';

    if (msg.includes('401') || msg.includes('403') || msg.includes('Auth required')) {
      return { type: 'auth_required', message: 'Authentication required' };
    }
    if (msg.includes('not registered')) {
      return { type: 'user_not_registered', message: 'User not registered for this app' };
    }
    return { type: 'unknown', message: msg || 'Failed to fetch user' };
  }, [rawError]);

  const isAuthenticated = !!user;
  const isAdmin = user?.platform_role === 'super_admin' || user?.platform_role === 'platform_admin';

  // ── Login Mutation (Email / Password) ──────────────────────────
  const loginMutation = useMutation({
    mutationFn: (credentials) => api.login(credentials),
    onSuccess: (data) => {
      // If backend says MFA is required, do not prematurely cache user
      if (data?.mfa_required) return; 
      
      if (data?.user) {
        queryClient.setQueryData(['authUser'], data.user);
      } else {
        queryClient.invalidateQueries({ queryKey: ['authUser'] });
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
    }
  });

  // ── Logout Mutation ───────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      // Clean up cache instantly regardless of API network response state
      queryClient.setQueryData(['authUser'], null);
      queryClient.clear();
      localStorage.removeItem('activeClientId');
    }
  });

  // ──Profile Update Mutation ───────────────────────────────────
  const updateMeMutation = useMutation({
    mutationFn: (updates) => api.updateMe(updates),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['authUser'], updatedUser);
    },
    onError: (error) => {
      console.error('Update profile failed:', error);
    }
  });

  // ── Legacy / Compatibility Methods ────────────────────────────
  // Kept intact if external packages require manual callbacks
  const handleOAuthTokenLogin = async () => {
    await queryClient.invalidateQueries({ queryKey: ['authUser'] });
  };

  const navigateToLogin = () => {
    console.log("Authentication required, redirecting to login...");
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      authError,
      isAuthenticated,
      navigateToLogin,
      login: loginMutation.mutateAsync,
      logout: logoutMutation.mutateAsync,
      updateMe: updateMeMutation.mutateAsync,
      handleOAuthTokenLogin,
      api,
      refreshUser: () => queryClient.invalidateQueries({ queryKey: ['authUser'] })
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};