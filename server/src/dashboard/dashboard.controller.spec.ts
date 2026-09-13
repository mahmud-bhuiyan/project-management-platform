import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardController', () => {
  let dashboardController: DashboardController;

  const dashboardService = {
    getStats: vi.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: vi.fn(),
          },
        },
        JwtAuthGuard,
      ],
    }).compile();

    dashboardController = module.get(DashboardController);
  });

  it('returns dashboard stats', async () => {
    dashboardService.getStats.mockResolvedValue({
      totalProjects: 0,
      activeProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      charts: {
        tasksByStatus: [],
        tasksByPriority: [],
        projectProgress: [],
      },
    });

    const result = await dashboardController.getStats(createAuthenticatedRequest(), {
      organizationId: 'org-1',
    });

    expect(dashboardService.getStats).toHaveBeenCalledWith('user-1', 'org-1');
    expect(result.data.stats).toEqual({
      totalProjects: 0,
      activeProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      charts: {
        tasksByStatus: [],
        tasksByPriority: [],
        projectProgress: [],
      },
    });
    expect(result.message).toBe('Dashboard stats retrieved successfully');
  });
});
