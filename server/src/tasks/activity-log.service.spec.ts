import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { UsersService } from '../users/users.service.js';
import { ActivityAction } from './activity.types.js';
import { ActivityLogService } from './activity-log.service.js';

const actor = {
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

const activityRecord = {
  id: 'activity-1',
  taskId: 'task-1',
  actorId: actor.id,
  action: ActivityAction.TASK_CREATED,
  metadata: { title: 'Design landing page hero' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  actor,
};

describe('ActivityLogService', () => {
  let activityLogService: ActivityLogService;

  const projectsService = {
    assertCanAccessProject: vi.fn(),
  };

  const usersService = {
    toSafeUser: vi.fn((user: typeof actor) => {
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),
  };

  const prisma = {
    task: {
      findFirst: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    projectsService.assertCanAccessProject.mockResolvedValue(undefined);
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1' });
    prisma.activityLog.create.mockResolvedValue(activityRecord);
    prisma.activityLog.findMany.mockResolvedValue([activityRecord]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectsService, useValue: projectsService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    activityLogService = module.get(ActivityLogService);
  });

  it('records activity for a task', async () => {
    const activity = await activityLogService.record({
      taskId: 'task-1',
      actorId: actor.id,
      action: ActivityAction.TASK_CREATED,
      metadata: { title: 'Design landing page hero' },
    });

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        taskId: 'task-1',
        actorId: actor.id,
        action: ActivityAction.TASK_CREATED,
        metadata: { title: 'Design landing page hero' },
      },
      include: { actor: true },
    });
    expect(activity.action).toBe(ActivityAction.TASK_CREATED);
    expect(activity.actor.email).toBe(actor.email);
  });

  it('lists activity for a task', async () => {
    const activity = await activityLogService.findAllForTask(
      actor.id,
      'org-1',
      'project-1',
      'task-1',
    );

    expect(projectsService.assertCanAccessProject).toHaveBeenCalled();
    expect(activity).toHaveLength(1);
    expect(activity[0].action).toBe(ActivityAction.TASK_CREATED);
  });

  it('rejects users without project access', async () => {
    projectsService.assertCanAccessProject.mockRejectedValue(
      new ApiException(
        'Insufficient project permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      ),
    );

    await expect(
      activityLogService.findAllForTask(
        actor.id,
        'org-1',
        'project-1',
        'task-1',
      ),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('throws when task is not found in project', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      activityLogService.findAllForTask(
        actor.id,
        'org-1',
        'project-1',
        'missing',
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'TASK_NOT_FOUND',
      },
      status: HttpStatus.NOT_FOUND,
    });
  });
});
