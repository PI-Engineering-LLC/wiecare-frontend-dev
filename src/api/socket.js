import { io } from 'socket.io-client';

const originalUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
let cleanUrl = originalUrl.replace(/^http/, 'ws');
if (cleanUrl.endsWith('/api')) {
  cleanUrl = cleanUrl.slice(0, -4);
}

const socket = io(cleanUrl, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  withCredentials: true,
  autoConnect: false
});

export default socket;
