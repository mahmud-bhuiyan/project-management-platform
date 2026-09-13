import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectPriority, ProjectStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

const project = {
  id: 'project-1',
  organizationId: 'org-1',
  name: 'Website Redesign',
  description: 'Refresh marketing site UX.',
  status: ProjectStatus.PLANNING,
  priority: ProjectPriority.MEDIUM,
  ownerId: 'user-1',
  startDate: null,
  dueDate: null,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  owner: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('ProjectsController', () => {
  let projectsController: ProjectsController;

  const projectsService = {
    create: vi.fn(),
    findAllForOrganization: vi.fn(),
    findOneForOrganization: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    remove: vi.fn(),
  };

  const organizationsService = {
    getMembershipForUser: vi.fn(),
  };

  const createAuthenticatedRequest = () =>
    ({
      user: {
        id: 'user-1',
        email: 'admin@acme.com',
        platformRole: 'USER',
      },
    }) as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    projectsService.create.mockResolvedValue(project);
    projectsService.findAllForOrganization.mockResolvedValue([project]);
    projectsService.findOneForOrganization.mockResolvedValue(project);
    projectsService.update.mockResolvedValue({
      ...project,
      status: ProjectStatus.ACTIVE,
    });
    projectsService.archive.mockResolvedValue({
      ...project,
      status: ProjectStatus.ARCHIVED,
      archivedAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    projectsService.remove.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: projectsService },
        { provide: OrganizationsService, useValue: organizationsService },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: vi.fn(),
          },
        },
        JwtAuthGuard,
        OrganizationRoleGuard,
      ],
    }).compile();

    projectsController = module.get(ProjectsController);
  });

  it('create returns created project', async () => {
    const result = await projectsController.create(
      createAuthenticatedRequest(),
      'org-1',
      { name: 'Website Redesign', description: 'Refresh marketing site UX.' },
    );

    expect(projectsService.create).toHaveBeenCalledWith('user-1', 'org-1', {
      name: 'Website Redesign',
      description: 'Refresh marketing site UX.',
      status: undefined,
      priority: undefined,
      ownerId: undefined,
      startDate: undefined,
      dueDate: undefined,
    });
    expect(result.data.project.id).toBe('project-1');
    expect(result.message).toBe('Project created successfully');
  });

  it('findAll returns projects for organization', async () => {
    const result = await projectsController.findAll(
      createAuthenticatedRequest(),
      'org-1',
      {},
    );

    expect(projectsService.findAllForOrganization).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      false,
    );
    expect(result.data.projects).toHaveLength(1);
  });

  it('archive returns archived project', async () => {
    const result = await projectsController.archive(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
    );

    expect(projectsService.archive).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
    );
    expect(result.data.project.status).toBe(ProjectStatus.ARCHIVED);
  });

  it('remove returns deleted response', async () => {
    const result = await projectsController.remove(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
    );

    expect(projectsService.remove).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
    );
    expect(result.message).toBe('Project deleted successfully');
    expect(result.data).toBeNull();
  });
});
