import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectStatus, TaskStatus } from '@prisma/client';
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
    },
    task: {
      count: vi.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizationsService },
      ],
    }).compile();

    dashboardService = module.get(DashboardService);
  });

  it('returns dashboard stats for organization members', async () => {
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
    });
  });
});
