import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
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

describe('AuthController', () => {
  let authController: AuthController;

  const authService = {
    createCompanyAdmin: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
  };

  const createResponse = () =>
    ({
      cookie: vi.fn(),
    }) as unknown as Response;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        SuperAdminGuard,
      ],
    }).compile();

    authController = module.get(AuthController);
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
      {
        cookies: {
          [REFRESH_TOKEN_COOKIE]: 'raw-refresh-token',
        },
      },
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
});
