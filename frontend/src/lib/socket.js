import { io } from "socket.io-client";
import { api } from "./api.js";

let socket = null;

// One connection per session, opened after login and closed on logout -
// never opened without a token, since the backend's io.use() middleware
// rejects the handshake without one anyway.
export function connectSocket() {
  const token = localStorage.getItem("ss_token");
  if (!token) return null;
  if (socket?.connected) return socket;

  socket = io(api.API_BASE, { auth: { token }, transports: ["websocket", "polling"] });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
