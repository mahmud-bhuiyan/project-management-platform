import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { REFRESH_TOKEN_COOKIE } from './auth-cookie.util.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const loginResult = {
  accessToken: 'jwt-access-token',
  user: {
    id: 'user-1',
    email: 'admin@acme.com',
    name: 'Acme Admin',
    platformRole: 'USER' as const,
    avatarUrl: null,
    themePreference: 'LIGHT' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  refreshToken: 'raw-refresh-token',
};

const companyAdminResult = {
  user: loginResult.user,
  organization: {
    id: 'org-1',
    name: 'Acme Technologies',
    slug: 'acme-technologies',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
};

describe('AuthController', () => {
  let authController: AuthController;

  const authService = {
    createCompanyAdmin: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  };

  const createResponse = () =>
    ({
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    }) as unknown as Response;

  const createRequest = (overrides: Partial<Request>) =>
    overrides as unknown as Request;

  const createAuthenticatedRequest = (overrides: Partial<AuthenticatedRequest>) =>
    overrides as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: vi.fn(),
          },
        },
        JwtAuthGuard,
        OptionalJwtAuthGuard,
        SuperAdminGuard,
      ],
    }).compile();

    authController = module.get(AuthController);
  });

  it('createCompanyAdmin returns created response', async () => {
    authService.createCompanyAdmin.mockResolvedValue(companyAdminResult);

    const result = await authController.createCompanyAdmin({
      email: 'admin@acme.com',
      name: 'Acme Admin',
      password: 'password123',
      organizationName: 'Acme Technologies',
      organizationSlug: 'acme-technologies',
    });

    expect(authService.createCompanyAdmin).toHaveBeenCalledWith({
      email: 'admin@acme.com',
      name: 'Acme Admin',
      password: 'password123',
      organizationName: 'Acme Technologies',
      organizationSlug: 'acme-technologies',
    });
    expect(result).toEqual({
      message: 'Company admin created successfully',
      data: companyAdminResult,
    });
    expect(result.data.user).not.toHaveProperty('passwordHash');
  });

  it('login returns ok response payload and sets refresh cookie', async () => {
    authService.login.mockResolvedValue(loginResult);
    const res = createResponse();

    const result = await authController.login(
      {
        email: 'admin@acme.com',
        password: 'password123',
      },
      res,
    );

    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@acme.com',
      password: 'password123',
    });
    expect(res.cookie).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Login successful',
      data: {
        accessToken: loginResult.accessToken,
        user: loginResult.user,
      },
    });
    expect(result.data.user).not.toHaveProperty('passwordHash');
    expect(result.data).not.toHaveProperty('refreshToken');
  });

  it('refresh returns new access token and rotates refresh cookie', async () => {
    authService.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    const res = createResponse();

    const result = await authController.refresh(
      createRequest({
        cookies: {
          [REFRESH_TOKEN_COOKIE]: 'raw-refresh-token',
        },
      }),
      res,
    );

    expect(authService.refresh).toHaveBeenCalledWith('raw-refresh-token');
    expect(res.cookie).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Token refreshed successfully',
      data: {
        accessToken: 'new-access-token',
      },
    });
  });

  it('logout clears refresh cookie and deletes refresh token', async () => {
    authService.logout.mockResolvedValue(undefined);
    const res = createResponse();

    const result = await authController.logout(
      createRequest({
        cookies: {
          [REFRESH_TOKEN_COOKIE]: 'raw-refresh-token',
        },
      }),
      res,
    );

    expect(authService.logout).toHaveBeenCalledWith('raw-refresh-token');
    expect(res.clearCookie).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Logged out successfully',
      data: null,
    });
  });

  it('me returns current user profile', async () => {
    authService.getMe.mockResolvedValue(loginResult.user);

    const result = await authController.me(
      createAuthenticatedRequest({
        user: {
          id: loginResult.user.id,
          email: loginResult.user.email,
          platformRole: loginResult.user.platformRole,
        },
      }),
    );

    expect(authService.getMe).toHaveBeenCalledWith(loginResult.user.id);
    expect(result).toEqual({
      message: 'Profile retrieved successfully',
      data: {
        user: loginResult.user,
      },
    });
  });
});

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    jwtService = {
      verifyAsync: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
  });

  it('allows valid bearer token and attaches user to request', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'admin@acme.com',
      platformRole: 'USER',
    });

    const request = {
      headers: {
        authorization: 'Bearer jwt-access-token',
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request).toEqual({
      headers: {
        authorization: 'Bearer jwt-access-token',
      },
      user: {
        id: 'user-1',
        email: 'admin@acme.com',
        platformRole: 'USER',
      },
    });
  });

  it('rejects missing bearer token', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        return true;
      },
    );
  });

  it('rejects invalid bearer token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Bearer invalid-token',
          },
        }),
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        return true;
      },
    );
  });
});

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  let jwtService: { verifyAsync: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    jwtService = {
      verifyAsync: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionalJwtAuthGuard,
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    guard = module.get(OptionalJwtAuthGuard);
  });

  it('passes without bearer token and leaves user unset', async () => {
    const request = { headers: {} };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request).not.toHaveProperty('user');
  });

  it('attaches user when bearer token is valid', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'superadmin@flowdesk.local',
      platformRole: 'SUPERADMIN',
    });

    const request: {
      headers: { authorization: string };
      user?: { id: string; email: string; platformRole: string };
    } = {
      headers: {
        authorization: 'Bearer jwt-access-token',
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'superadmin@flowdesk.local',
      platformRole: 'SUPERADMIN',
    });
  });

  it('passes with invalid bearer token and leaves user unset', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    const request = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request).not.toHaveProperty('user');
  });
});

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;
  const originalBootstrapKey = process.env.SUPERADMIN_BOOTSTRAP_KEY;

  beforeEach(() => {
    guard = new SuperAdminGuard();
    process.env.SUPERADMIN_BOOTSTRAP_KEY = 'test-bootstrap-key';
  });

  afterEach(() => {
    if (originalBootstrapKey === undefined) {
      delete process.env.SUPERADMIN_BOOTSTRAP_KEY;
    } else {
      process.env.SUPERADMIN_BOOTSTRAP_KEY = originalBootstrapKey;
    }
  });

  const createContext = (request: Record<string, unknown>) => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  });

  it('allows authenticated superadmin user', () => {
    expect(
      guard.canActivate(
        createContext({
          user: { platformRole: 'SUPERADMIN' },
        }) as never,
      ),
    ).toBe(true);
  });

  it('allows valid bootstrap key header', () => {
    expect(
      guard.canActivate(
        createContext({
          headers: { 'x-superadmin-key': 'test-bootstrap-key' },
        }) as never,
      ),
    ).toBe(true);
  });

  it('rejects non-superadmin without bootstrap key', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          headers: {},
          user: { platformRole: 'USER' },
        }) as never,
      ),
    ).toThrow(ApiException);
  });
});
