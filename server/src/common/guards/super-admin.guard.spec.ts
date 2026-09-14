import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../exceptions/api.exception.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.types.js';
import { SuperAdminGuard } from './super-admin.guard.js';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  const createContext = (request: AuthenticatedRequest) => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  });

  beforeEach(() => {
    vi.unstubAllEnvs();
    guard = new SuperAdminGuard();
  });

  it('allows authenticated superadmin users', () => {
    const allowed = guard.canActivate(
      createContext({
        user: {
          id: 'super-1',
          email: 'superadmin@flowdesk.local',
          platformRole: 'SUPERADMIN',
        },
      } as AuthenticatedRequest) as never,
    );

    expect(allowed).toBe(true);
  });

  it('allows requests with a valid bootstrap key header', () => {
    vi.stubEnv('SUPERADMIN_BOOTSTRAP_KEY', 'bootstrap-secret');

    const allowed = guard.canActivate(
      createContext({
        headers: { 'x-superadmin-key': 'bootstrap-secret' },
      } as AuthenticatedRequest) as never,
    );

    expect(allowed).toBe(true);
  });

  it('rejects regular users without bootstrap key', () => {
    try {
      guard.canActivate(
        createContext({
          user: {
            id: 'user-1',
            email: 'admin@acme.dev',
            platformRole: 'USER',
          },
          headers: {},
        } as AuthenticatedRequest) as never,
      );
      expect.unreachable('Expected superadmin guard to reject regular users');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });
});
