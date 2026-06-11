import { useAuth } from '@/lib/AuthContext';

export function usePlatformRole(
    role
  ) {
    const { user } =
      useAuth();
  
    return (
      user?.platform_role ===
      role
    );
  }