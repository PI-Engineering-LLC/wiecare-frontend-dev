import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useClient } from '@/lib/ClientContext';
import { AlertTriangle } from 'lucide-react';

export const SUSPENDED_MESSAGE =
  'Your account is currently on hold due to an overdue invoice. Please contact Wiegand before submitting another request.';

export function useClientSuspended() {
  const { data: user } = useQuery({
    queryKey: ['me-suspended'],
    queryFn: () => api.me(),
    staleTime: 60000,
    retry: false,
  });
 const { activeClientId } = useClient();
  const isAdmin = user?.platform_role === 'super_admin' || user?.platform_role === 'platform_admin';
  const clientId = activeClientId;

  const { data: client } = useQuery({
    queryKey: ['client-suspended', clientId],
    queryFn: () => api.getClient(clientId),
    enabled: !isAdmin && !!clientId,
    staleTime: 60000,
    retry: false,
  });

  return !isAdmin && client?.on_hold;

//   return !isAdmin && client?.status === 'suspended';
}

export function SuspendedNotice() {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <p className="text-sm font-medium">{SUSPENDED_MESSAGE}</p>
    </div>
  );
}
