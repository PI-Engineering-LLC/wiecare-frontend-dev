import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL.replace('/api', ''), {
  // auth: { token: localStorage.getItem('token') },
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  withCredentials: true,
  autoConnect: false
});

/**
 * import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(token, onNotification) {
 * const socketRef = useRef(null);
 * useEffect(() => {
 *   if (!token) return;
 * socketRef.current = io(import.meta.env.VITE_API_URL.replace('/api', '') , {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    withCredentials: true, autoConnect: false 
  });
  socketRef.current.on('notification:new', () => {
       *onNotification(data);
        loadNotifications();
        queryClient.invalidateQueries({ queryKey: ['notif-panel'] });
      });

   socketRef.current.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    return () => socketRef.current.disconnect();

 *},[token]
 return socketRef.current;
 *}
 * 
 * import { useSocket } from '../hooks/useSocket';

function App() {
  const token = localStorage.getItem('token'); // or from your auth state

  useSocket(token, (notification) => {
    console.log('New notification:', notification);
    // update your notifications state / show a toast
  });

  return <div>...</div>;
}
 * 
 * 

 const socket = io(import.meta.env.VITE_API_URL , {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    withCredentials: true, autoConnect: false 
  });


  // Socket.io — real-time notification updates
    useEffect(() => {
      socket.connect();
  
      socket.on('notification:new', () => {
        loadNotifications();
        queryClient.invalidateQueries({ queryKey: ['notif-panel'] });
      });
  
      socket.on('notification:read', () => {
        loadNotifications();
      });
  
      return () => {
        socket.off('notification:new');
        socket.off('notification:read');
        socket.disconnect();
      };
    }, []);
 */
/**
 * Using cookies
 const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,   // send cookies with the connection
  autoConnect: false,      // connect manually after login
});

// After successful login:
socket.connect();
socket.emit('join_tenant', user.tenant_id); // not needed because of backend middleware approach, no client side joining

// Logout:
socket.disconnect();

useEffect(() => {
  socket.on('offer_received', ({ offerId }) => {
    // show notification, refetch data, etc.
  });

  return () => {
    socket.off('offer_received'); // always clean up
  };
}, []);

 */

export default socket;


/**
 * 
 *import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

export function useSocket({ token, onNotification }) {
  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
      autoConnect: false,
      auth: { token },
    });

    socketRef.current.connect();

    socketRef.current.on('notification:new', (data) => {
      onNotification(data);
      queryClient.invalidateQueries({ queryKey: ['notif-panel'] });
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  return socketRef.current;
}
 */