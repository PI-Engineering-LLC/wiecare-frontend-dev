import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';
import { usePlatformRole } from '@/hooks/usePlatfromRole';

export function useClientRoles(allowedRoleNames){ 
    const { user } = useAuth();
    const { activeClientId } = useClient(); 

    // PLATFORM ADMINS bypass client-specific role checks
    if( usePlatformRole('super_admin') ||  usePlatformRole('platform_admin')){
        return true;
    }

    if (!user || !user.memberships || !activeClientId || !allowedRoleNames || allowedRoleNames.length === 0) {
        return false; // Not authenticated, no active client, or no roles to check
    }

    const membership = user.memberships.find( m => m.clientId === activeClientId);

    if (!membership || !membership.roles) {
        return false; // User is not a member of the active client or has no roles in it
    }

    // Check if any of the user's roles in the active client membership are in the allowedRoleNames array
    return membership.roles.some(role => allowedRoleNames.includes(role.name));
}