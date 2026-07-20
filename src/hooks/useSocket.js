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
      onNotificationRef.current(data);
      queryClient.invalidateQueries({ queryKey: ['notif-panel'] });
      queryClient.invalidateQueries({ queryKey: ['notifications']}); 
      queryClient.invalidateQueries({ queryKey: ['admin-notifications']}); 
      if (data?.category === 'invoice') {
        queryClient.invalidateQueries({ queryKey: ['payments']});
      queryClient.invalidateQueries({ queryKey: ['invoices']});
      queryClient.invalidateQueries({ queryKey: ['admin-invoices']});
      queryClient.invalidateQueries({ queryKey: ['admin-payments']});
      }
      if (data?.category === 'quote') {
        queryClient.invalidateQueries({ queryKey: ['admin-quotes']});
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
      if (data?.category === 'maintenance') {
        queryClient.invalidateQueries({ queryKey: ['admin-maintenance']});
        queryClient.invalidateQueries({ queryKey: ['maintenance']});
      }
      if (data?.category === 'training') {
        queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
        queryClient.invalidateQueries({ queryKey: ['admin-training-requests'] });
        queryClient.invalidateQueries({ queryKey: ['registrations']});
        queryClient.invalidateQueries({ queryKey: ['training-requests']})
        queryClient.invalidateQueries({ queryKey: ['trainings'] });
      }
      if (data?.category === 'warranty') {
        queryClient.invalidateQueries({ queryKey: ['admin-warranty']});
        queryClient.invalidateQueries({ queryKey: ['warrantyClaims'] });
      }
    };

    const handleConnectError = (err) => {
      console.error('Socket error:', err.message);
      // queryClient.setQueryData(['authUser'], null);
      // queryClient.clear();
      // localStorage.removeItem('activeClientId');
    };

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