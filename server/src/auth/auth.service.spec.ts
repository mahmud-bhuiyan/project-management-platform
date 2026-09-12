import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import * as passwordUtil from '../common/utils/password.util.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

vi.mock('../common/utils/password.util.js', () => ({
  comparePassword: vi.fn(),
}));

const safeUser = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Acme Admin',
  platformRole: 'USER' as const,
  avatarUrl: null,
  themePreference: 'LIGHT' as const,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const storedUser = {
  ...safeUser,
  passwordHash: '$2b$12$hashed-password',
};

describe('AuthService', () => {
  let authService: AuthService;

  const organizationsService = {
    createCompanyAdmin: vi.fn(),
  };

  const usersService = {
    findByEmail: vi.fn(),
    toSafeUser: vi.fn(),
  };

  const jwtService = {
    signAsync: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('login returns access token and safe user', async () => {
    usersService.findByEmail.mockResolvedValue(storedUser);
    usersService.toSafeUser.mockReturnValue(safeUser);
    vi.mocked(passwordUtil.comparePassword).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-access-token');

    const result = await authService.login({
      email: 'admin@acme.com',
      password: 'password123',
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith('admin@acme.com');
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: safeUser.id,
      email: safeUser.email,
      platformRole: safeUser.platformRole,
    });
    expect(result).toEqual({
      accessToken: 'jwt-access-token',
      user: safeUser,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('login rejects unknown email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@acme.com',
        password: 'password123',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      return true;
    });
  });

  it('login rejects wrong password', async () => {
    usersService.findByEmail.mockResolvedValue(storedUser);
    vi.mocked(passwordUtil.comparePassword).mockResolvedValue(false);

    await expect(
      authService.login({
        email: 'admin@acme.com',
        password: 'wrong-password',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      return true;
    });
  });
});
