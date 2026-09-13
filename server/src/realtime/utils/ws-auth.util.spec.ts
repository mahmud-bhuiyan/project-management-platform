import type { Socket } from 'socket.io';
import { describe, expect, it } from 'vitest';
import { extractSocketToken } from './ws-auth.util.js';

function createSocket(handshake: Partial<Socket['handshake']>): Socket {
  return { handshake } as Socket;
}

describe('extractSocketToken', () => {
  it('reads token from auth payload', () => {
    const socket = createSocket({
      auth: { token: 'auth-token' },
      query: {},
      headers: {},
    });

    expect(extractSocketToken(socket)).toBe('auth-token');
  });

  it('reads token from query string', () => {
    const socket = createSocket({
      auth: {},
      query: { token: 'query-token' },
      headers: {},
    });

    expect(extractSocketToken(socket)).toBe('query-token');
  });

  it('reads bearer token from authorization header', () => {
    const socket = createSocket({
      auth: {},
      query: {},
      headers: { authorization: 'Bearer header-token' },
    });

    expect(extractSocketToken(socket)).toBe('header-token');
  });

  it('returns undefined when no token is present', () => {
    const socket = createSocket({
      auth: {},
      query: {},
      headers: {},
    });

    expect(extractSocketToken(socket)).toBeUndefined();
  });
});
