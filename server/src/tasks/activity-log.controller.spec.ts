import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { ActivityAction } from './activity.types.js';
import { ActivityLogController } from './activity-log.controller.js';
import { ActivityLogService } from './activity-log.service.js';

const activity = {
  id: 'activity-1',
  taskId: 'task-1',
  actorId: 'user-1',
  action: ActivityAction.TASK_CREATED,
  metadata: { title: 'Design landing page hero' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  actor: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('ActivityLogController', () => {
  let activityLogController: ActivityLogController;

  const activityLogService = {
    findAllForTask: vi.fn(),
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
    activityLogService.findAllForTask.mockResolvedValue([activity]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLogController],
      providers: [
        { provide: ActivityLogService, useValue: activityLogService },
        {
          provide: JwtService,
          useValue: { verify: vi.fn(), sign: vi.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    activityLogController = module.get(ActivityLogController);
  });

  it('lists activity for a task', async () => {
    const response = await activityLogController.findAll(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
    );

    expect(activityLogService.findAllForTask).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
    );
    expect(response.data).toEqual({ activity: [activity] });
  });
});
