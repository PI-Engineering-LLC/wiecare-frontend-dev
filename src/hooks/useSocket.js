import { useEffect, useRef } from 'react';
import socket from '@/api/socket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

export function useSocket(onNotification) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  // Use a ref for onNotification so we always call the latest version
  // without needing it as a useEffect dependency
  const onNotificationRef = useRef(onNotification);
  useEffect(() => {
    onNotificationRef.current = onNotification;
  });

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket.connected) socket.disconnect();
      return;
    }
    
    if (!socket.connected) {
      socket.connect();
    }

    const handleNotification = (data) => {
      // console.log('New notification:', data);
      onNotificationRef.current(data);
      queryClient.invalidateQueries({ queryKey: ['notif-panel'] });
      queryClient.invalidateQueries({ queryKey: ['notifications']}); 
      queryClient.invalidateQueries({ queryKey: ['admin-notifications']}); 
      if (data?.category === 'invoice') {
        queryClient.invalidateQueries({ queryKey: ['payments']});
      queryClient.invalidateQueries({ queryKey: ['invoices']});
      queryClient.invalidateQueries({ queryKey: ['admin-invoices']});
      queryClient.invalidateQueries({ queryKey: ['admin-payments']});
      queryClient.invalidateQueries({ queryKey: ['org-invoices']});
      }
      if (data?.category === 'quote') {
        queryClient.invalidateQueries({ queryKey: ['admin-quotes']});
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
      if (data?.category === 'maintenance') {
        queryClient.invalidateQueries({ queryKey: ['admin-maintenance']});
        queryClient.invalidateQueries({ queryKey: ['maintenance']});
        queryClient.invalidateQueries({ queryKey: ['org-maintenance']});
      }
      if (data?.category === 'training') {
        queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
        queryClient.invalidateQueries({ queryKey: ['admin-training-requests'] });
        queryClient.invalidateQueries({ queryKey: ['registrations']});
        queryClient.invalidateQueries({ queryKey: ['all-registrations']});
        queryClient.invalidateQueries({ queryKey: ['training-requests']})
        queryClient.invalidateQueries({ queryKey: ['trainings'] });
      }
      if (data?.category === 'warranty') {
        queryClient.invalidateQueries({ queryKey: ['admin-warranty']});
        queryClient.invalidateQueries({ queryKey: ['warrantyClaims'] });
        queryClient.invalidateQueries({ queryKey: ['org-warranty']});
      }
      if (data?.category === 'course') {
        queryClient.invalidateQueries({ queryKey: ['admin-courses']});
        queryClient.invalidateQueries({ queryKey: ['courses']});
        queryClient.invalidateQueries({ queryKey: ['courseProgress'] });
      }
      if (data?.category === 'document') {
        queryClient.invalidateQueries({ queryKey: ['admin-documents']});
        queryClient.invalidateQueries({ queryKey: ['documents']});
      }
      if (data?.category === 'client') {
        queryClient.invalidateQueries({ queryKey: ['admin-clients']});
        queryClient.invalidateQueries({ queryKey: ['clients']});
        queryClient.invalidateQueries({ queryKey: ['client']});
      }
      if (data?.category === 'user') {
        queryClient.invalidateQueries({ queryKey: ['admin-users']});
        queryClient.invalidateQueries({ queryKey: ['users']});
        queryClient.invalidateQueries({ queryKey: ['user']});
        queryClient.invalidateQueries({ queryKey: ['authUser']});
        queryClient.invalidateQueries({ queryKey: ['org-users']});
      }
      if (data?.category === 'invite') {
        queryClient.invalidateQueries({ queryKey: ['admin-invites']});
        queryClient.invalidateQueries({ queryKey: ['invites']});
      }
      if (data?.category === 'role') {
        queryClient.invalidateQueries({ queryKey: ['roles']});
      }
      if (data?.category === 'permission') {
        queryClient.invalidateQueries({ queryKey: ['permissions']});
      }
      if (data?.category === 'order') {
        queryClient.invalidateQueries({ queryKey: ['admin-orders']});
        queryClient.invalidateQueries({ queryKey: ['orders']});
        queryClient.invalidateQueries({ queryKey: ['admin-part-orders']});
        queryClient.invalidateQueries({ queryKey: ['orders-for-invoice']});
        queryClient.invalidateQueries({ queryKey: ['sub-orders-for-invoice']});
        queryClient.invalidateQueries({ queryKey: ['org-orders']});
      }
      if (data?.category === 'part') {
        queryClient.invalidateQueries({ queryKey: ['admin-parts']});
        queryClient.invalidateQueries({ queryKey: ['admin-part-orders']});
      }
    };

    const handleConnectError = (err) => {
      console.error('Socket error:', err.message);
      // queryClient.setQueryData(['authUser'], null);
      // queryClient.clear();
      // localStorage.removeItem('activeClientId');
    };
    socket.on('connect', () => console.log('Connected'));

    socket.on('notification:new', handleNotification);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('connect_error', handleConnectError);
      if (!isAuthenticated && socket.connected) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated]);
}