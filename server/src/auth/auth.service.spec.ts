import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import * as passwordUtil from '../common/utils/password.util.js';
import * as tokenUtil from '../common/utils/token.util.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

vi.mock('../common/utils/password.util.js', () => ({
  comparePassword: vi.fn(),
}));

vi.mock('../common/utils/token.util.js', () => ({
  generateRefreshToken: vi.fn(),
  hashRefreshToken: vi.fn(),
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
    findById: vi.fn(),
    toSafeUser: vi.fn(),
  };

  const jwtService = {
    signAsync: vi.fn(),
  };

  const prisma = {
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('createCompanyAdmin delegates to organizations service', async () => {
    const dto = {
      email: 'admin@acme.com',
      name: 'Acme Admin',
      password: 'password123',
      organizationName: 'Acme Technologies',
      organizationSlug: 'acme-technologies',
    };
    const companyAdminResult = {
      user: safeUser,
      organization: {
        id: 'org-1',
        name: 'Acme Technologies',
        slug: 'acme-technologies',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    };

    organizationsService.createCompanyAdmin.mockResolvedValue(companyAdminResult);

    const result = await authService.createCompanyAdmin(dto);

    expect(organizationsService.createCompanyAdmin).toHaveBeenCalledWith(dto);
    expect(result).toEqual(companyAdminResult);
  });

  it('login returns access token, user, and refresh token', async () => {
    usersService.findByEmail.mockResolvedValue(storedUser);
    usersService.toSafeUser.mockReturnValue(safeUser);
    vi.mocked(passwordUtil.comparePassword).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-access-token');
    vi.mocked(tokenUtil.generateRefreshToken).mockReturnValue('raw-refresh-token');
    vi.mocked(tokenUtil.hashRefreshToken).mockReturnValue('hashed-refresh-token');
    prisma.refreshToken.create.mockResolvedValue({});

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
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: safeUser.id,
        tokenHash: 'hashed-refresh-token',
        expiresAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      accessToken: 'jwt-access-token',
      user: safeUser,
      refreshToken: 'raw-refresh-token',
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

  it('refresh returns a new access token and rotated refresh token', async () => {
    const storedRefreshToken = {
      id: 'refresh-1',
      userId: safeUser.id,
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 60_000),
      user: storedUser,
    };

    vi.mocked(tokenUtil.hashRefreshToken).mockReturnValue('hashed-refresh-token');
    prisma.refreshToken.findFirst.mockResolvedValue(storedRefreshToken);
    prisma.refreshToken.delete.mockResolvedValue({});
    usersService.toSafeUser.mockReturnValue(safeUser);
    jwtService.signAsync.mockResolvedValue('new-access-token');
    vi.mocked(tokenUtil.generateRefreshToken).mockReturnValue('new-refresh-token');
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await authService.refresh('raw-refresh-token');

    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { id: 'refresh-1' },
    });
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });

  it('refresh rejects missing token', async () => {
    await expect(authService.refresh(undefined)).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        return true;
      },
    );
  });

  it('refresh rejects invalid token', async () => {
    vi.mocked(tokenUtil.hashRefreshToken).mockReturnValue('hashed-refresh-token');
    prisma.refreshToken.findFirst.mockResolvedValue(null);

    await expect(authService.refresh('invalid-token')).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        return true;
      },
    );
  });

  it('refresh rejects expired token', async () => {
    const expiredToken = {
      id: 'refresh-1',
      userId: safeUser.id,
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() - 60_000),
      user: storedUser,
    };

    vi.mocked(tokenUtil.hashRefreshToken).mockReturnValue('hashed-refresh-token');
    prisma.refreshToken.findFirst.mockResolvedValue(expiredToken);
    prisma.refreshToken.delete.mockResolvedValue({});

    await expect(authService.refresh('expired-token')).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        return true;
      },
    );

    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { id: 'refresh-1' },
    });
  });

  it('logout deletes refresh token when cookie is present', async () => {
    vi.mocked(tokenUtil.hashRefreshToken).mockReturnValue('hashed-refresh-token');
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await authService.logout('raw-refresh-token');

    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: 'hashed-refresh-token' },
    });
  });

  it('logout is a no-op when cookie is missing', async () => {
    await authService.logout(undefined);

    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('getMe returns safe user', async () => {
    usersService.findById.mockResolvedValue(storedUser);
    usersService.toSafeUser.mockReturnValue(safeUser);

    const result = await authService.getMe(safeUser.id);

    expect(usersService.findById).toHaveBeenCalledWith(safeUser.id);
    expect(result).toEqual(safeUser);
  });

  it('getMe rejects missing user', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(authService.getMe('missing-user-id')).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        return true;
      },
    );
  });
});
