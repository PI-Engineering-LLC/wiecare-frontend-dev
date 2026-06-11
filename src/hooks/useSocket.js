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
      console.log("TTTT~~~~~~~~~!", socket.auth, socket.connected)
    }

    const handleNotification = (data) => {
      onNotificationRef.current(data);
      queryClient.invalidateQueries({ queryKey: ['notif-panel'] });
    };

    const handleConnectError = (err) => {
      console.error('Socket error:', err.message);
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