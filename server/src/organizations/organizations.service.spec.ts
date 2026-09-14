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
      update: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
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

  it('create creates organization and owner membership with generated slug', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        organization: {
          create: vi.fn().mockResolvedValue(mockOrganization),
        },
        organizationMember: {
          create: vi.fn().mockResolvedValue({}),
        },
      }),
    );

    const result = await organizationsService.create('user-1', {
      name: 'Acme Technologies',
    });

    expect(result.slug).toBe('acme-technologies');
    expect(result.role).toBe('OWNER');
  });

  it('create rejects duplicate slug', async () => {
    prisma.organization.findUnique.mockResolvedValue(mockOrganization);

    await expect(
      organizationsService.create('user-1', {
        name: 'Acme Technologies',
        slug: 'acme-technologies',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
      return true;
    });
  });

  it('findAllForUser returns organizations with roles', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([
      {
        role: 'OWNER',
        organization: mockOrganization,
      },
    ]);

    const result = await organizationsService.findAllForUser('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('OWNER');
    expect(result[0].slug).toBe('acme-technologies');
  });

  it('findOneForUser throws when membership is missing', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue(null);

    await expect(
      organizationsService.findOneForUser('user-1', 'missing-org'),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      return true;
    });
  });

  it('update changes organization name for managers', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
      organizationId: 'org-1',
      userId: 'user-1',
    });
    prisma.organization.update.mockResolvedValue({
      ...mockOrganization,
      name: 'Acme Corp',
    });

    const result = await organizationsService.update('user-1', 'org-1', {
      name: 'Acme Corp',
    });

    expect(result.name).toBe('Acme Corp');
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: { name: 'Acme Corp' },
    });
  });

  it('update rejects viewers', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({
      role: 'VIEWER',
      organizationId: 'org-1',
      userId: 'user-4',
    });

    await expect(
      organizationsService.update('user-4', 'org-1', { name: 'Acme Corp' }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('addMember adds an existing user as member', async () => {
    const targetUser = {
      ...mockUser,
      id: 'user-2',
      email: 'member@acme.dev',
      name: 'Team Member',
    };

    prisma.organizationMember.findUnique
      .mockResolvedValueOnce({ role: 'OWNER', organizationId: 'org-1', userId: 'user-1' })
      .mockResolvedValueOnce(null);
    usersService.findByEmail.mockResolvedValue(targetUser);
    usersService.toSafeUser.mockReturnValue({
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      avatarUrl: targetUser.avatarUrl,
      platformRole: targetUser.platformRole,
      themePreference: targetUser.themePreference,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
    });
    prisma.organizationMember.create.mockResolvedValue({
      id: 'member-2',
      organizationId: 'org-1',
      userId: targetUser.id,
      role: 'MEMBER',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      user: targetUser,
    });

    const result = await organizationsService.addMember('user-1', 'org-1', {
      email: 'member@acme.dev',
    });

    expect(result.user.email).toBe('member@acme.dev');
    expect(result.role).toBe('MEMBER');
  });

  it('addMember rejects viewers', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({
      role: 'VIEWER',
      organizationId: 'org-1',
      userId: 'user-4',
    });

    await expect(
      organizationsService.addMember('user-4', 'org-1', {
        email: 'member@acme.dev',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('updateMemberRole rejects viewers', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({
      role: 'VIEWER',
      organizationId: 'org-1',
      userId: 'user-4',
    });

    await expect(
      organizationsService.updateMemberRole('user-4', 'org-1', 'member-2', {
        role: 'MEMBER',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('removeMember rejects viewers', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({
      role: 'VIEWER',
      organizationId: 'org-1',
      userId: 'user-4',
    });

    await expect(
      organizationsService.removeMember('user-4', 'org-1', 'member-2'),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('updateMemberRole updates member role for admins', async () => {
    const targetUser = {
      ...mockUser,
      id: 'user-2',
      email: 'member@acme.dev',
    };

    prisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
      organizationId: 'org-1',
      userId: 'user-1',
    });
    prisma.organizationMember.findFirst.mockResolvedValue({
      id: 'member-2',
      organizationId: 'org-1',
      userId: targetUser.id,
      role: 'MEMBER',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      user: targetUser,
    });
    prisma.organizationMember.update.mockResolvedValue({
      id: 'member-2',
      organizationId: 'org-1',
      userId: targetUser.id,
      role: 'ADMIN',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      user: targetUser,
    });
    usersService.toSafeUser.mockReturnValue({
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      avatarUrl: targetUser.avatarUrl,
      platformRole: targetUser.platformRole,
      themePreference: targetUser.themePreference,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
    });

    const result = await organizationsService.updateMemberRole(
      'user-1',
      'org-1',
      'member-2',
      { role: 'ADMIN' },
    );

    expect(result.role).toBe('ADMIN');
  });

  it('removeMember deletes a member', async () => {
    const targetUser = {
      ...mockUser,
      id: 'user-2',
      email: 'member@acme.dev',
    };

    prisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
      organizationId: 'org-1',
      userId: 'user-1',
    });
    prisma.organizationMember.findFirst.mockResolvedValue({
      id: 'member-2',
      organizationId: 'org-1',
      userId: targetUser.id,
      role: 'MEMBER',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      user: targetUser,
    });
    prisma.organizationMember.delete.mockResolvedValue({});

    await organizationsService.removeMember('user-1', 'org-1', 'member-2');

    expect(prisma.organizationMember.delete).toHaveBeenCalledWith({
      where: { id: 'member-2' },
    });
  });
});
