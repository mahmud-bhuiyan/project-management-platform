import { TaskStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType } from './notification.types.js';
import { NotificationTriggersService } from './notification-triggers.service.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationTriggersService', () => {
  let notificationTriggersService: NotificationTriggersService;

  const notificationsService = {
    create: vi.fn(),
  };

  const prisma = {
    projectMember: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    notificationsService.create.mockResolvedValue({ id: 'notification-1' });
    prisma.projectMember.findMany.mockResolvedValue([
      {
        userId: 'user-manager',
        user: {
          email: 'manager@acme.dev',
          name: 'Project Manager',
        },
      },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTriggersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    notificationTriggersService = module.get(NotificationTriggersService);
  });

  it('notifies the assignee when a task is assigned', async () => {
    await notificationTriggersService.notifyTaskAssigned({
      actorId: 'user-admin',
      assigneeId: 'user-manager',
      organizationId: 'org-1',
      projectId: 'project-1',
      taskId: 'task-1',
      taskTitle: 'Design landing page hero',
      actorName: 'Acme Admin',
    });

    expect(notificationsService.create).toHaveBeenCalledWith({
      userId: 'user-manager',
      type: NotificationType.TASK_ASSIGNED,
      title: 'Task assigned to you',
      body: 'Acme Admin assigned you to "Design landing page hero".',
      metadata: {
        organizationId: 'org-1',
        projectId: 'project-1',
        taskId: 'task-1',
        actorId: 'user-admin',
      },
    });
  });

  it('skips self-assignment notifications', async () => {
    await notificationTriggersService.notifyTaskAssigned({
      actorId: 'user-admin',
      assigneeId: 'user-admin',
      organizationId: 'org-1',
      projectId: 'project-1',
      taskId: 'task-1',
      taskTitle: 'Design landing page hero',
      actorName: 'Acme Admin',
    });

    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('notifies the assignee when task status changes', async () => {
    await notificationTriggersService.notifyTaskStatusChanged({
      actorId: 'user-admin',
      assigneeId: 'user-manager',
      organizationId: 'org-1',
      projectId: 'project-1',
      taskId: 'task-1',
      taskTitle: 'Design landing page hero',
      actorName: 'Acme Admin',
      from: TaskStatus.BACKLOG,
      to: TaskStatus.IN_PROGRESS,
    });

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-manager',
        type: NotificationType.TASK_STATUS_CHANGED,
      }),
    );
  });

  it('notifies mentioned project members in a comment', async () => {
    await notificationTriggersService.notifyCommentMentions({
      actorId: 'user-admin',
      authorName: 'Acme Admin',
      organizationId: 'org-1',
      projectId: 'project-1',
      taskId: 'task-1',
      taskTitle: 'Design landing page hero',
      commentId: 'comment-1',
      body: 'Please loop in @manager for review.',
    });

    expect(prisma.projectMember.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1' },
      include: { user: true },
    });
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-manager',
        type: NotificationType.MENTION,
      }),
    );
  });
});
