import { Reflector } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../../common/exceptions/api.exception.js';
import type { OrganizationAuthenticatedRequest } from '../organizations.types.js';
import { OrganizationsService } from '../organizations.service.js';
import { OrganizationRoleGuard } from './organization-role.guard.js';
import { REQUIRE_ORGANIZATION_ROLES_KEY } from '../decorators/require-organization-roles.decorator.js';

describe('OrganizationRoleGuard', () => {
  let guard: OrganizationRoleGuard;

  const reflector = {
    getAllAndOverride: vi.fn(),
  };

  const organizationsService = {
    getMembershipForUser: vi.fn(),
  };

  const createContext = (request: OrganizationAuthenticatedRequest) => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new OrganizationRoleGuard(
      reflector as unknown as Reflector,
      organizationsService as unknown as OrganizationsService,
    );
  });

  it('allows managers when OWNER or ADMIN role is required', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.ADMIN,
    });

    const request = {
      user: { id: 'user-1', email: 'admin@acme.dev', platformRole: 'USER' },
      params: { id: 'org-1' },
    } as OrganizationAuthenticatedRequest;

    const allowed = await guard.canActivate(createContext(request) as never);

    expect(allowed).toBe(true);
    expect(request.organizationMembership?.role).toBe(OrganizationRole.ADMIN);
  });

  it('rejects viewers for manager-only routes', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    const request = {
      user: { id: 'user-4', email: 'viewer@acme.dev', platformRole: 'USER' },
      params: { organizationId: 'org-1' },
    } as OrganizationAuthenticatedRequest;

    await expect(
      guard.canActivate(createContext(request) as never),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('skips role checks when decorator metadata is absent', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const request = {
      user: { id: 'user-1', email: 'admin@acme.dev', platformRole: 'USER' },
      params: { id: 'org-1' },
    } as OrganizationAuthenticatedRequest;

    const allowed = await guard.canActivate(createContext(request) as never);

    expect(allowed).toBe(true);
    expect(organizationsService.getMembershipForUser).not.toHaveBeenCalled();
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_ORGANIZATION_ROLES_KEY,
      expect.any(Array),
    );
  });
});
