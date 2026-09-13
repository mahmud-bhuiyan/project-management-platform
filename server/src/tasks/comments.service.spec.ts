import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { NotificationTriggersService } from '../notifications/notification-triggers.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { CommentsService } from './comments.service.js';
import { TasksService } from './tasks.service.js';

const author = {
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

const commentRecord = {
  id: 'comment-1',
  taskId: 'task-1',
  authorId: author.id,
  body: 'Looks good — please add mobile breakpoints.',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  author,
};

describe('CommentsService', () => {
  let commentsService: CommentsService;

  const tasksService = {
    ensureTaskReadAccess: vi.fn(),
    ensureTaskMutationAccess: vi.fn(),
  };

  const usersService = {
    toSafeUser: vi.fn((user: typeof author) => {
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),
  };

  const activityLogService = {
    record: vi.fn(),
  };

  const notificationTriggersService = {
    notifyCommentMentions: vi.fn(),
  };

  const prisma = {
    comment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    tasksService.ensureTaskReadAccess.mockResolvedValue({ id: 'task-1' });
    tasksService.ensureTaskMutationAccess.mockResolvedValue({ id: 'task-1' });
    prisma.comment.create.mockResolvedValue(commentRecord);
    prisma.comment.findMany.mockResolvedValue([commentRecord]);
    prisma.comment.findFirst.mockResolvedValue(commentRecord);
    prisma.comment.update.mockResolvedValue({
      ...commentRecord,
      body: 'Updated comment body',
    });
    prisma.comment.delete.mockResolvedValue(commentRecord);
    prisma.task.findFirst.mockResolvedValue({
      id: 'task-1',
      title: 'Design landing page hero',
      project: { organizationId: 'org-1' },
    });
    notificationTriggersService.notifyCommentMentions.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TasksService, useValue: tasksService },
        { provide: UsersService, useValue: usersService },
        { provide: ActivityLogService, useValue: activityLogService },
        {
          provide: NotificationTriggersService,
          useValue: notificationTriggersService,
        },
      ],
    }).compile();

    commentsService = module.get(CommentsService);
  });

  it('creates a comment for the authenticated user', async () => {
    const comment = await commentsService.create(
      author.id,
      'org-1',
      'project-1',
      'task-1',
      { body: 'Looks good — please add mobile breakpoints.' },
    );

    expect(tasksService.ensureTaskMutationAccess).toHaveBeenCalled();
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        taskId: 'task-1',
        authorId: author.id,
        body: 'Looks good — please add mobile breakpoints.',
      },
      include: { author: true },
    });
    expect(comment.author.email).toBe(author.email);
    expect(notificationTriggersService.notifyCommentMentions).toHaveBeenCalled();
  });

  it('lists comments for a task', async () => {
    const comments = await commentsService.findAllForTask(
      author.id,
      'org-1',
      'project-1',
      'task-1',
    );

    expect(tasksService.ensureTaskReadAccess).toHaveBeenCalled();
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe(commentRecord.body);
  });

  it('updates own comment', async () => {
    const comment = await commentsService.update(
      author.id,
      'org-1',
      'project-1',
      'task-1',
      'comment-1',
      { body: 'Updated comment body' },
    );

    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: 'comment-1' },
      data: { body: 'Updated comment body' },
      include: { author: true },
    });
    expect(comment.body).toBe('Updated comment body');
  });

  it('blocks editing another user comment', async () => {
    await expect(
      commentsService.update(
        'other-user',
        'org-1',
        'project-1',
        'task-1',
        'comment-1',
        { body: 'Hijacked' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'FORBIDDEN',
      },
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('deletes own comment', async () => {
    await commentsService.remove(
      author.id,
      'org-1',
      'project-1',
      'task-1',
      'comment-1',
    );

    expect(prisma.comment.delete).toHaveBeenCalledWith({
      where: { id: 'comment-1' },
    });
  });

  it('throws when comment is not found', async () => {
    prisma.comment.findFirst.mockResolvedValue(null);

    await expect(
      commentsService.findOneForTask(
        author.id,
        'org-1',
        'project-1',
        'task-1',
        'missing',
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'COMMENT_NOT_FOUND',
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('blocks mutations when task access is denied', async () => {
    tasksService.ensureTaskMutationAccess.mockRejectedValue(
      new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      ),
    );

    await expect(
      commentsService.create(author.id, 'org-1', 'project-1', 'task-1', {
        body: 'Blocked',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
  });
});
