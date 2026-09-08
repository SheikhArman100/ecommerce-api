import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Secret } from 'jsonwebtoken';

import config from '../config';
import { jwtHelpers } from '../helpers/jwtHelpers';

/**
 * Socket.IO server instance.
 * Attached to the HTTP server once the app boots (see server.ts).
 * @type {Server | null}
 */
let io: Server | null = null;

/** Room names for targeting admins / individual users. */
export const ADMIN_ROOM = 'admins';
export const userRoom = (userId: number | string) => `user:${userId}`;

/**
 * Verifies the JWT token supplied at socket handshake time and returns the
 * verified user payload, or `null` if the token is missing/invalid.
 *
 * The token is accepted from either:
 *   - the `authorization` header: `Bearer <accessToken>`
 *   - the `token` query param (useful for socket.io clients that can't set headers)
 */
const authenticate = (data: { authorization?: string; token?: string }): any => {
  let token: string | undefined;

  if (data.authorization && data.authorization.startsWith('Bearer ')) {
    token = data.authorization.split(' ')[1];
  } else if (data.token) {
    token = data.token;
  }

  if (!token || token === 'null') return null;

  try {
    return jwtHelpers.verifyToken(token, config.jwt.access_secret as Secret);
  } catch (error) {
    return null;
  }
};

/**
 * Initializes and attaches the Socket.IO server to the running HTTP server.
 * Should be called exactly once during startup.
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  // Authenticate on every handshake
  io.use((socket, next) => {
    const user = authenticate(socket.handshake.auth || {});
    if (!user) {
      return next(new Error('authentication error'));
    }
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; role: string };
    const { role, id } = user;

    // Route the socket to the appropriate room (admins vs individual users)
    if (role === 'admin') {
      socket.join(ADMIN_ROOM);
    } else {
      socket.join(userRoom(id));
    }

    socket.on('disconnect', () => {
      socket.leave(ADMIN_ROOM);
      socket.leave(userRoom(id));
      socket.disconnect();
    });
  });

  return io;
};

/**
 * Emits a payload to all connected admins via the admins room.
 */
export const emitToAdmins = <T = any>(event: string, payload: T): void => {
  io?.to(ADMIN_ROOM).emit(event, payload);
};

/**
 * Emits a payload to a single user's room.
 */
export const emitToUser = <T = any>(
  userId: number | string,
  event: string,
  payload: T,
): void => {
  io?.to(userRoom(userId)).emit(event, payload);
};

/**
 * Returns the underlying Socket.IO server (used for tests / advanced cases).
 */
export const getSocketServer = (): Server | null => io;

export const SocketServer = {
  initSocketServer,
  emitToAdmins,
  emitToUser,
  getSocketServer,
};