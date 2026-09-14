import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OrganizationRole,
  ProjectPriority,
  ProjectStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
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

const projectRecord = {
  id: 'project-1',
  organizationId: 'org-1',
  name: 'Website Redesign',
  description: 'Refresh marketing site UX.',
  status: ProjectStatus.PLANNING,
  priority: ProjectPriority.MEDIUM,
  ownerId: owner.id,
  startDate: null,
  dueDate: null,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  owner,
};

describe('ProjectsService', () => {
  let projectsService: ProjectsService;

  const organizationsService = {
    getMembershipForUser: vi.fn(),
    findOneForUser: vi.fn(),
  };

  const usersService = {
    toSafeUser: vi.fn((user: typeof owner) => {
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),
  };

  const tx = {
    project: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    projectMember: {
      create: vi.fn(),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
    organizationMember: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.OWNER,
    });
    organizationsService.findOneForUser.mockResolvedValue({
      id: 'org-1',
      name: 'Acme Technologies',
      slug: 'acme',
      role: OrganizationRole.OWNER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.organizationMember.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      userId: owner.id,
      role: OrganizationRole.OWNER,
    });
    tx.project.create.mockResolvedValue(projectRecord);
    tx.projectMember.create.mockResolvedValue({
      id: 'pm-1',
      projectId: projectRecord.id,
      userId: owner.id,
      role: OrganizationRole.OWNER,
      createdAt: new Date(),
    });
    tx.project.findUniqueOrThrow.mockResolvedValue(projectRecord);
    prisma.project.findMany.mockResolvedValue([projectRecord]);
    prisma.projectMember.findUnique.mockResolvedValue({
      projectId: projectRecord.id,
      userId: owner.id,
      role: OrganizationRole.OWNER,
    });
    prisma.project.findFirst.mockResolvedValue(projectRecord);
    prisma.project.update.mockResolvedValue({
      ...projectRecord,
      status: ProjectStatus.ACTIVE,
    });
    prisma.project.delete.mockResolvedValue(projectRecord);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    projectsService = module.get(ProjectsService);
  });

  it('creates a project for organization managers', async () => {
    const project = await projectsService.create('user-1', 'org-1', {
      name: 'Website Redesign',
      description: 'Refresh marketing site UX.',
    });

    expect(organizationsService.getMembershipForUser).toHaveBeenCalledWith(
      'user-1',
      'org-1',
    );
    expect(tx.project.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        name: 'Website Redesign',
        description: 'Refresh marketing site UX.',
        status: ProjectStatus.PLANNING,
        priority: undefined,
        ownerId: 'user-1',
        startDate: undefined,
        dueDate: undefined,
      },
    });
    expect(tx.projectMember.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        userId: 'user-1',
        role: OrganizationRole.OWNER,
      },
    });
    expect(project.name).toBe('Website Redesign');
    expect(project.owner.email).toBe('admin@acme.dev');
  });

  it('lists projects for organization members excluding archived by default', async () => {
    const projects = await projectsService.findAllForOrganization(
      'user-1',
      'org-1',
    );

    expect(organizationsService.findOneForUser).toHaveBeenCalledWith(
      'user-1',
      'org-1',
    );
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        archivedAt: null,
      },
      include: { owner: true },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    });
    expect(projects).toHaveLength(1);
  });

  it('rejects viewers creating projects', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    await expect(
      projectsService.create('user-4', 'org-1', { name: 'Blocked Project' }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('rejects viewers updating projects', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    await expect(
      projectsService.update('user-4', 'org-1', 'project-1', {
        name: 'Blocked update',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('rejects viewers archiving projects', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    await expect(
      projectsService.archive('user-4', 'org-1', 'project-1'),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('rejects viewers deleting projects', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    await expect(
      projectsService.remove('user-4', 'org-1', 'project-1'),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('archives a project', async () => {
    const archivedProject = {
      ...projectRecord,
      status: ProjectStatus.ARCHIVED,
      archivedAt: new Date('2026-02-01T00:00:00.000Z'),
    };
    prisma.project.update.mockResolvedValue(archivedProject);

    const project = await projectsService.archive('user-1', 'org-1', 'project-1');

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: {
        status: ProjectStatus.ARCHIVED,
        archivedAt: expect.any(Date),
      },
      include: { owner: true },
    });
    expect(project.status).toBe(ProjectStatus.ARCHIVED);
  });

  it('deletes a project', async () => {
    await projectsService.remove('user-1', 'org-1', 'project-1');

    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: 'project-1' },
    });
  });

  it('returns a project for members with project access', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.MEMBER,
    });

    const project = await projectsService.findOneForOrganization(
      'user-2',
      'org-1',
      'project-1',
    );

    expect(project.id).toBe('project-1');
  });

  it('rejects org members without project access', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.MEMBER,
    });
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      projectsService.findOneForOrganization('user-2', 'org-1', 'project-1'),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });
});
