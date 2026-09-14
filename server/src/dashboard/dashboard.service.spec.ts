import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  let dashboardService: DashboardService;

  const organizationsService = {
    findOneForUser: vi.fn(),
  };

  const prisma = {
    project: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      count: vi.fn(),
      groupBy: vi.fn(),
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

    prisma.project.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    prisma.task.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);

    prisma.task.groupBy
      .mockResolvedValueOnce([
        { status: TaskStatus.TODO, _count: { _all: 3 } },
        { status: TaskStatus.DONE, _count: { _all: 4 } },
      ])
      .mockResolvedValueOnce([
        { priority: TaskPriority.MEDIUM, _count: { _all: 6 } },
        { priority: TaskPriority.HIGH, _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([
        { projectId: 'project-1', _count: { _all: 2 } },
      ]);

    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Website',
        _count: { tasks: 5 },
      },
      {
        id: 'project-2',
        name: 'Mobile',
        _count: { tasks: 0 },
      },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizationsService },
      ],
    }).compile();

    dashboardService = module.get(DashboardService);
  });

  it('returns dashboard stats and chart data for organization members', async () => {
    const stats = await dashboardService.getStats('user-1', 'org-1');

    expect(organizationsService.findOneForUser).toHaveBeenCalledWith(
      'user-1',
      'org-1',
    );
    expect(prisma.project.count).toHaveBeenNthCalledWith(1, {
      where: { organizationId: 'org-1', archivedAt: null },
    });
    expect(prisma.project.count).toHaveBeenNthCalledWith(2, {
      where: {
        organizationId: 'org-1',
        archivedAt: null,
        status: ProjectStatus.ACTIVE,
      },
    });
    expect(prisma.task.count).toHaveBeenNthCalledWith(1, {
      where: { project: { organizationId: 'org-1' } },
    });
    expect(prisma.task.count).toHaveBeenNthCalledWith(2, {
      where: {
        project: { organizationId: 'org-1' },
        status: TaskStatus.DONE,
      },
    });
    expect(stats).toEqual({
      totalProjects: 3,
      activeProjects: 2,
      totalTasks: 10,
      completedTasks: 4,
      overdueTasks: 1,
      charts: {
        tasksByStatus: [
          { status: TaskStatus.BACKLOG, count: 0 },
          { status: TaskStatus.TODO, count: 3 },
          { status: TaskStatus.IN_PROGRESS, count: 0 },
          { status: TaskStatus.REVIEW, count: 0 },
          { status: TaskStatus.DONE, count: 4 },
        ],
        tasksByPriority: [
          { priority: TaskPriority.LOW, count: 0 },
          { priority: TaskPriority.MEDIUM, count: 6 },
          { priority: TaskPriority.HIGH, count: 2 },
          { priority: TaskPriority.CRITICAL, count: 0 },
        ],
        projectProgress: [
          {
            projectId: 'project-1',
            projectName: 'Website',
            totalTasks: 5,
            completedTasks: 2,
          },
        ],
      },
    });
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
      dashboardService.getStats('user-9', 'missing-org'),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      return true;
    });
  });
});
