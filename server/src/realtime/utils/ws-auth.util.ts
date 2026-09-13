import type { Socket } from 'socket.io';
import { extractBearerToken } from '../../common/utils/auth-header.util.js';

export function extractSocketToken(client: Socket): string | undefined {
  const authToken = client.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const queryToken = client.handshake.query?.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }
  if (Array.isArray(queryToken) && queryToken[0]?.trim()) {
    return queryToken[0].trim();
  }

  const authorization = client.handshake.headers.authorization;
  return extractBearerToken(
    typeof authorization === 'string' ? authorization : undefined,
  );
}
