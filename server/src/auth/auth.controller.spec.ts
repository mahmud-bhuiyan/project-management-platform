import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
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
};

describe('AuthController', () => {
  let authController: AuthController;

  const authService = {
    createCompanyAdmin: vi.fn(),
    login: vi.fn(),
  };

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

  it('login returns ok response payload', async () => {
    authService.login.mockResolvedValue(loginResult);

    const result = await authController.login({
      email: 'admin@acme.com',
      password: 'password123',
    });

    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@acme.com',
      password: 'password123',
    });
    expect(result).toEqual({
      message: 'Login successful',
      data: loginResult,
    });
    expect(result.data.user).not.toHaveProperty('passwordHash');
  });
});
