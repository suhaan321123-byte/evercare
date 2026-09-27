import { io } from "socket.io-client";

// export const socket = io(import.meta.env.VITE_SOCKET_URL, {
//   withCredentials: true,
// });
// export const socket = io(import.meta.env.VITE_BACKEND_URL);

export const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
  withCredentials: true,
  reconnection: true, // Enable reconnection
  reconnectionAttempts: Infinity, // Keep trying to reconnect indefinitely
  reconnectionDelay: 1000, // Initial reconnection delay of 1 second
  reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts is 5 seconds
});
