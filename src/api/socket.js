import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL.replace('/api', '').replace(/^http/, 'ws'), {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  withCredentials: true,
  autoConnect: false
});

export default socket;
