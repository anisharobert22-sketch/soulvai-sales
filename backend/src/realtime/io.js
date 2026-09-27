/**
 * A single Socket.io instance, set once by server.js at boot and reused
 * by any route/lib that needs to push a live update. Rooms are per-org
 * ("org:<id>") so a POS vendor's team never sees another org's traffic,
 * and per-user ("user:<id>") for assignment/reminder pushes aimed at one
 * person. Redis stays out per the plan - this only needs to work across
 * sockets on a single Node instance until a second instance exists.
 */
let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function getIo() {
  if (!ioInstance) throw new Error("Socket.io has not been initialized yet");
  return ioInstance;
}

function emitToOrg(orgId, event, payload) {
  if (!ioInstance) return; // realtime is a nice-to-have, never a hard dependency for an API call to succeed
  ioInstance.to(`org:${orgId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setIo, getIo, emitToOrg, emitToUser };
