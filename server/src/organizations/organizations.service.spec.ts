import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Organization, User } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { OrganizationsService } from './organizations.service.js';

const mockUser: User = {
  id: 'user-1',
  email: 'admin@acme.com',
  passwordHash: 'hashed-password',
  name: 'Acme Admin',
  avatarUrl: null,
  platformRole: 'USER',
  themePreference: 'LIGHT',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Acme Technologies',
  slug: 'acme-technologies',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('OrganizationsService', () => {
  let organizationsService: OrganizationsService;

  const prisma = {
    organization: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const usersService = {
    findByEmail: vi.fn(),
    toSafeUser: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    organizationsService = module.get(OrganizationsService);
  });

  it('createCompanyAdmin creates user, organization, and owner membership', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue(null);
    usersService.toSafeUser.mockReturnValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      avatarUrl: mockUser.avatarUrl,
      platformRole: mockUser.platformRole,
      themePreference: mockUser.themePreference,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    });

    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        user: {
          create: vi.fn().mockResolvedValue(mockUser),
        },
        organization: {
          create: vi.fn().mockResolvedValue(mockOrganization),
        },
        organizationMember: {
          create: vi.fn().mockResolvedValue({}),
        },
      }),
    );

    const result = await organizationsService.createCompanyAdmin({
      email: 'admin@acme.com',
      name: 'Acme Admin',
      password: 'password123',
      organizationName: 'Acme Technologies',
      organizationSlug: 'acme-technologies',
    });

    expect(result.user.email).toBe('admin@acme.com');
    expect(result.organization.slug).toBe('acme-technologies');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('createCompanyAdmin rejects duplicate email', async () => {
    usersService.findByEmail.mockResolvedValue(mockUser);

    await expect(
      organizationsService.createCompanyAdmin({
        email: 'admin@acme.com',
        name: 'Acme Admin',
        password: 'password123',
        organizationName: 'Acme Technologies',
        organizationSlug: 'acme-technologies',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
      return true;
    });
  });
});
