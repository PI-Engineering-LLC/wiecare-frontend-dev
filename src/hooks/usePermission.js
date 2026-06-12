import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';
import { usePlatformRole } from '@/hooks/usePlatfromRole';

export function usePermission(permissionString){ 
    const { user } = useAuth();
    const { activeClientId } = useClient();

    // PLATFORM ADMINS bypass client-specific permission checks
    if( usePlatformRole('super_admin') ||  usePlatformRole('platform_admin')){
        return true;
    }

    if (!user || !user.memberships || !activeClientId || !permissionString) {
        return false; // Not authenticated, no active client, or no permission to check
    }

    const membership = user.memberships.find( m => m.clientId === activeClientId);

    if (!membership || !membership.permissions) {
        return false; // User is not a member of the active client or has no permissions in it
    }

    // Check if the specific permissionString is included in the membership's permissions
    return membership.permissions.includes(permissionString);
}