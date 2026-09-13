import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { ProjectMembersService } from './project-members.service.js';
import { ProjectsService } from './projects.service.js';

const owner = {
  id: 'user-1',
  email: 'admin@acme.dev',
  name: 'Acme Admin',
  passwordHash: 'hash',
  platformRole: 'USER' as const,
  avatarUrl: null,
  themePreference: 'LIGHT' as const,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const memberUser = {
  id: 'user-2',
  email: 'member@acme.dev',
  name: 'Team Member',
  passwordHash: 'hash',
  platformRole: 'USER' as const,
  avatarUrl: null,
  themePreference: 'LIGHT' as const,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('ProjectMembersService', () => {
  let projectMembersService: ProjectMembersService;

  const organizationsService = {
    getMembershipForUser: vi.fn(),
  };

  const projectsService = {
    assertCanAccessProject: vi.fn(),
    getProjectForOrganization: vi.fn(),
  };

  const usersService = {
    findByEmail: vi.fn(),
    toSafeUser: vi.fn((user: typeof memberUser) => {
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),
  };

  const prisma = {
    projectMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.OWNER,
    });
    projectsService.getProjectForOrganization.mockResolvedValue({
      id: 'project-1',
      organizationId: 'org-1',
      ownerId: owner.id,
    });
    usersService.findByEmail.mockResolvedValue(memberUser);
    prisma.organizationMember.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      userId: memberUser.id,
      role: OrganizationRole.MEMBER,
    });
    prisma.projectMember.findUnique.mockResolvedValue(null);
    prisma.projectMember.findMany.mockResolvedValue([
      {
        id: 'pm-1',
        projectId: 'project-1',
        userId: owner.id,
        role: OrganizationRole.OWNER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        user: owner,
      },
    ]);
    prisma.projectMember.create.mockResolvedValue({
      id: 'pm-2',
      projectId: 'project-1',
      userId: memberUser.id,
      role: OrganizationRole.MEMBER,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      user: memberUser,
    });
    prisma.projectMember.findFirst.mockResolvedValue({
      id: 'pm-2',
      projectId: 'project-1',
      userId: memberUser.id,
      role: OrganizationRole.MEMBER,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      user: memberUser,
      project: {
        id: 'project-1',
        ownerId: owner.id,
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectMembersService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: UsersService, useValue: usersService },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    projectMembersService = module.get(ProjectMembersService);
  });

  it('lists project members for users with project access', async () => {
    const members = await projectMembersService.listMembers(
      'user-1',
      'org-1',
      'project-1',
    );

    expect(projectsService.assertCanAccessProject).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
    );
    expect(members).toHaveLength(1);
    expect(members[0].user.email).toBe('admin@acme.dev');
  });

  it('adds an organization member to a project', async () => {
    const member = await projectMembersService.addMember(
      'user-1',
      'org-1',
      'project-1',
      { email: 'member@acme.dev' },
    );

    expect(usersService.findByEmail).toHaveBeenCalledWith('member@acme.dev');
    expect(prisma.projectMember.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        userId: 'user-2',
        role: OrganizationRole.MEMBER,
      },
      include: { user: true },
    });
    expect(member.user.email).toBe('member@acme.dev');
  });

  it('rejects viewers adding project members', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    await expect(
      projectMembersService.addMember('user-4', 'org-1', 'project-1', {
        email: 'member@acme.dev',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('removes a non-owner project member', async () => {
    await projectMembersService.removeMember(
      'user-1',
      'org-1',
      'project-1',
      'pm-2',
    );

    expect(prisma.projectMember.delete).toHaveBeenCalledWith({
      where: { id: 'pm-2' },
    });
  });
});
