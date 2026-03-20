import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => socket;

export const initSocket = (token) => {
  if (socket) socket.disconnect();
  socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
