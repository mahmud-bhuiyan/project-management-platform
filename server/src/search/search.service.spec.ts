import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskStatus, ProjectStatus } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GlobalSearchResultType } from './search.types.js';
import { SearchService } from './search.service.js';

describe('SearchService', () => {
  let searchService: SearchService;

  const organizationsService = {
    findOneForUser: vi.fn(),
  };

  const prisma = {
    task: {
      findMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    organizationsService.findOneForUser.mockResolvedValue({
      id: 'org-1',
      name: 'Acme Technologies',
      slug: 'acme',
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    prisma.task.findMany.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Login API',
        status: TaskStatus.IN_PROGRESS,
        project: { id: 'project-1', name: 'Website Redesign' },
      },
    ]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Website Redesign',
        status: ProjectStatus.ACTIVE,
      },
    ]);
    prisma.organizationMember.findMany.mockResolvedValue([
      {
        user: {
          id: 'user-2',
          name: 'Alex Rivera',
          email: 'alex@acme.dev',
        },
      },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizationsService },
      ],
    }).compile();

    searchService = module.get(SearchService);
  });

  it('searches tasks, projects, and users for organization managers', async () => {
    const result = await searchService.search('user-1', 'org-1', {
      q: 'login',
      page: 1,
      limit: 20,
    });

    expect(organizationsService.findOneForUser).toHaveBeenCalledWith(
      'user-1',
      'org-1',
    );
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project: { organizationId: 'org-1' },
          title: { contains: 'login', mode: 'insensitive' },
        },
      }),
    );
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          archivedAt: null,
          name: { contains: 'login', mode: 'insensitive' },
        }),
      }),
    );
    expect(result.total).toBe(3);
    expect(result.results).toHaveLength(3);
    expect(result.results.map((item) => item.type)).toEqual([
      GlobalSearchResultType.USER,
      GlobalSearchResultType.TASK,
      GlobalSearchResultType.PROJECT,
    ]);
  });

  it('limits project and task search to member projects for non-managers', async () => {
    organizationsService.findOneForUser.mockResolvedValue({
      id: 'org-1',
      name: 'Acme Technologies',
      slug: 'acme',
      role: 'MEMBER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.task.findMany.mockResolvedValue([]);
    prisma.project.findMany.mockResolvedValue([]);
    prisma.organizationMember.findMany.mockResolvedValue([]);

    await searchService.search('user-1', 'org-1', {
      q: 'website',
      page: 1,
      limit: 20,
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project: {
            organizationId: 'org-1',
            members: { some: { userId: 'user-1' } },
          },
          title: { contains: 'website', mode: 'insensitive' },
        },
      }),
    );
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          members: { some: { userId: 'user-1' } },
        }),
      }),
    );
  });

  it('filters by result type when requested', async () => {
    prisma.project.findMany.mockResolvedValue([]);
    prisma.organizationMember.findMany.mockResolvedValue([]);

    await searchService.search('user-1', 'org-1', {
      q: 'login',
      page: 1,
      limit: 20,
      type: GlobalSearchResultType.TASK,
    });

    expect(prisma.task.findMany).toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.organizationMember.findMany).not.toHaveBeenCalled();
  });

  it('paginates merged results', async () => {
    prisma.task.findMany.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Alpha task',
        status: TaskStatus.TODO,
        project: { id: 'project-1', name: 'Alpha project' },
      },
      {
        id: 'task-2',
        title: 'Beta task',
        status: TaskStatus.TODO,
        project: { id: 'project-2', name: 'Beta project' },
      },
    ]);
    prisma.project.findMany.mockResolvedValue([]);
    prisma.organizationMember.findMany.mockResolvedValue([]);

    const result = await searchService.search('user-1', 'org-1', {
      q: 'task',
      page: 2,
      limit: 1,
    });

    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.title).toBe('Beta task');
  });

  it('rejects non-members of the organization', async () => {
    organizationsService.findOneForUser.mockRejectedValue(
      new ApiException(
        'Organization not found',
        'ORGANIZATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      ),
    );

    await expect(
      searchService.search('user-9', 'missing-org', {
        q: 'login',
        page: 1,
        limit: 20,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      return true;
    });
  });
});
