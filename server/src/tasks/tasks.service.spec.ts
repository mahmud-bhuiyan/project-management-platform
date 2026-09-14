import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OrganizationRole,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { UsersService } from '../users/users.service.js';
import { NotificationTriggersService } from '../notifications/notification-triggers.service.js';
import { RealtimeEmitterService } from '../realtime/realtime-emitter.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { TasksService } from './tasks.service.js';

const reporter = {
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

const taskRecord = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Design landing page hero',
  description: 'Include responsive breakpoints.',
  status: TaskStatus.BACKLOG,
  priority: TaskPriority.MEDIUM,
  assigneeId: null,
  reporterId: reporter.id,
  dueDate: null,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  assignee: null,
  reporter,
};

describe('TasksService', () => {
  let tasksService: TasksService;

  const organizationsService = {
    getMembershipForUser: vi.fn(),
  };

  const projectsService = {
    assertCanAccessProject: vi.fn(),
    getProjectForOrganization: vi.fn(),
  };

  const usersService = {
    findById: vi.fn(),
    toSafeUser: vi.fn((user: typeof reporter) => {
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),
  };

  const activityLogService = {
    record: vi.fn(),
  };

  const notificationTriggersService = {
    notifyTaskAssigned: vi.fn(),
    notifyTaskStatusChanged: vi.fn(),
  };

  const realtimeEmitter = {
    emitTaskReordered: vi.fn(),
    emitCommentCreated: vi.fn(),
    emitNotificationCreated: vi.fn(),
  };

  const tx = {
    task: {
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  };

  const prisma = {
    organizationMember: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
    task: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
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
      archivedAt: null,
    });
    projectsService.assertCanAccessProject.mockResolvedValue(undefined);
    prisma.task.aggregate.mockResolvedValue({ _max: { position: 0 } });
    prisma.task.create.mockResolvedValue(taskRecord);
    prisma.task.findMany.mockResolvedValue([taskRecord]);
    prisma.task.count.mockResolvedValue(1);
    prisma.task.findFirst.mockResolvedValue(taskRecord);
    prisma.task.update.mockResolvedValue({
      ...taskRecord,
      status: TaskStatus.IN_PROGRESS,
    });
    prisma.task.delete.mockResolvedValue(taskRecord);
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    tx.task.updateMany.mockResolvedValue({ count: 1 });
    tx.task.update.mockResolvedValue(taskRecord);
    usersService.findById.mockResolvedValue(reporter);
    notificationTriggersService.notifyTaskAssigned.mockResolvedValue(undefined);
    notificationTriggersService.notifyTaskStatusChanged.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: ProjectsService, useValue: projectsService },
        { provide: UsersService, useValue: usersService },
        { provide: ActivityLogService, useValue: activityLogService },
        {
          provide: NotificationTriggersService,
          useValue: notificationTriggersService,
        },
        { provide: RealtimeEmitterService, useValue: realtimeEmitter },
      ],
    }).compile();

    tasksService = module.get(TasksService);
  });

  it('creates a task for project managers', async () => {
    const task = await tasksService.create('user-1', 'org-1', 'project-1', {
      title: 'Design landing page hero',
      description: 'Include responsive breakpoints.',
    });

    expect(task.title).toBe('Design landing page hero');
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'project-1',
          reporterId: 'user-1',
          position: 1,
        }),
      }),
    );
  });

  it('lists tasks with pagination metadata', async () => {
    const result = await tasksService.findAllForProject(
      'user-1',
      'org-1',
      'project-1',
      { page: 1, limit: 20, status: TaskStatus.BACKLOG },
    );

    expect(result.tasks).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project-1',
          status: TaskStatus.BACKLOG,
        },
        skip: 0,
        take: 20,
      }),
    );
  });

  it('filters tasks by due date range', async () => {
    await tasksService.findAllForProject('user-1', 'org-1', 'project-1', {
      page: 1,
      limit: 20,
      dueFrom: '2026-01-01',
      dueTo: '2026-01-31',
      assigneeId: 'user-2',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project-1',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          assigneeId: 'user-2',
          dueDate: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lte: new Date('2026-01-31T23:59:59.999Z'),
          },
        },
      }),
    );
  });

  it('rejects invalid due date ranges', async () => {
    await expect(
      tasksService.findAllForProject('user-1', 'org-1', 'project-1', {
        page: 1,
        limit: 20,
        dueFrom: '2026-02-01',
        dueTo: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('filters tasks by search term across title, description, and assignee', async () => {
    await tasksService.findAllForProject('user-1', 'org-1', 'project-1', {
      page: 1,
      limit: 20,
      search: 'hero',
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project-1',
          OR: [
            { title: { contains: 'hero', mode: 'insensitive' } },
            { description: { contains: 'hero', mode: 'insensitive' } },
            {
              assignee: {
                name: { contains: 'hero', mode: 'insensitive' },
              },
            },
            {
              assignee: {
                email: { contains: 'hero', mode: 'insensitive' },
              },
            },
          ],
        },
      }),
    );
  });

  it('rejects task creation for organization viewers', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    try {
      await tasksService.create('user-1', 'org-1', 'project-1', {
        title: 'Blocked task',
      });
      expect.unreachable('Expected viewer task creation to be forbidden');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('rejects viewers updating tasks', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    await expect(
      tasksService.update('user-4', 'org-1', 'project-1', 'task-1', {
        title: 'Blocked update',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('rejects viewers deleting tasks', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    await expect(
      tasksService.remove('user-4', 'org-1', 'project-1', 'task-1'),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('rejects viewers reordering tasks', async () => {
    organizationsService.getMembershipForUser.mockResolvedValue({
      organizationId: 'org-1',
      role: OrganizationRole.VIEWER,
    });

    await expect(
      tasksService.reorder('user-4', 'org-1', 'project-1', [
        { taskId: 'task-1', status: TaskStatus.TODO, position: 0 },
      ]),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('rejects org members without project access when listing tasks', async () => {
    projectsService.assertCanAccessProject.mockRejectedValue(
      new ApiException(
        'Insufficient project permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      ),
    );

    await expect(
      tasksService.findAllForProject('user-2', 'org-1', 'project-1', {
        page: 1,
        limit: 20,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      return true;
    });
  });

  it('rejects assignee outside the organization', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.create('user-1', 'org-1', 'project-1', {
        title: 'Assigned task',
        assigneeId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('updates task status and repositions within the new column', async () => {
    const task = await tasksService.update(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      { status: TaskStatus.IN_PROGRESS },
    );

    expect(task.status).toBe(TaskStatus.IN_PROGRESS);
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          position: 1,
        }),
      }),
    );
  });

  it('reorders a single task across columns with position shifting', async () => {
    prisma.task.findMany
      .mockResolvedValueOnce([taskRecord])
      .mockResolvedValueOnce([
        {
          ...taskRecord,
          status: TaskStatus.IN_PROGRESS,
          position: 0,
        },
      ]);

    const result = await tasksService.reorder('user-1', 'org-1', 'project-1', [
      {
        taskId: 'task-1',
        status: TaskStatus.IN_PROGRESS,
        position: 0,
      },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'project-1',
          status: TaskStatus.BACKLOG,
          position: { gt: 0 },
        }),
        data: { position: { decrement: 1 } },
      }),
    );
    expect(tx.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: {
        status: TaskStatus.IN_PROGRESS,
        position: 0,
      },
    });
    expect(result.tasks[0].status).toBe(TaskStatus.IN_PROGRESS);
  });

  it('reorders multiple tasks in batch by setting final positions', async () => {
    const secondTask = {
      ...taskRecord,
      id: 'task-2',
      title: 'Build auth flow',
      position: 1,
    };

    prisma.task.findMany
      .mockResolvedValueOnce([taskRecord, secondTask])
      .mockResolvedValueOnce([
        { ...secondTask, position: 0 },
        { ...taskRecord, position: 1 },
      ]);

    const result = await tasksService.reorder('user-1', 'org-1', 'project-1', [
      { taskId: 'task-2', status: TaskStatus.BACKLOG, position: 0 },
      { taskId: 'task-1', status: TaskStatus.BACKLOG, position: 1 },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.task.update).toHaveBeenCalledTimes(2);
    expect(result.tasks).toHaveLength(2);
  });

  it('rejects duplicate positions in the same column during batch reorder', async () => {
    const secondTask = {
      ...taskRecord,
      id: 'task-2',
      title: 'Build auth flow',
      position: 1,
    };
    prisma.task.findMany.mockResolvedValueOnce([taskRecord, secondTask]);

    await expect(
      tasksService.reorder('user-1', 'org-1', 'project-1', [
        { taskId: 'task-1', status: TaskStatus.BACKLOG, position: 0 },
        { taskId: 'task-2', status: TaskStatus.BACKLOG, position: 0 },
      ]),
    ).rejects.toBeInstanceOf(ApiException);
  });
});
