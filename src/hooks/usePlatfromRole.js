import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';

export function usePlatformRole(
    role
  ) {
    const { user } =
      useAuth();
      const { activeClientId } = useClient(); 
  
    return (
      !activeClientId &&
      user?.platform_role ===
      role
    );
  }