import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { usePlatformRole } from '@/hooks/usePlatfromRole';
import { useClient } from '@/lib/ClientContext';
import { useClientRoles } from '@/hooks/useClientRoles';

export const ProtectedRoute = ({permission=null, platformRole=null, allowedRoles=null, children}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const { activeClientId } = useClient(); 

  // Check platform role directly from user object for platformRole prop
  const hasPlatformRole = usePlatformRole('super_admin') || usePlatformRole(platformRole);

  // Check client roles for the active client
  const hasClientRoles = useClientRoles(allowedRoles || []); // Pass allowedRoles array

  // Check specific permission for the active client
  const hasPermission = usePermission(permission);

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If a specific platformRole is required and the user doesn't have it
  if (platformRole && !hasPlatformRole) {
    return <Navigate to="/forbidden" replace />;
  }

  // If specific client roles are required and the user doesn't have them in the active client
  // Only check if allowedRoles is provided and not empty
  if (allowedRoles && allowedRoles.length > 0 && !hasClientRoles) {
    return <Navigate to="/forbidden" replace />;
  }

  // If a specific permission is required and the user doesn't have it in the active client
  if (permission && !hasPermission) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
