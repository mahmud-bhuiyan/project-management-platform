import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeEmitterService } from '../realtime/realtime-emitter.service.js';
import { NotificationType } from './notification.types.js';
import { NotificationsService } from './notifications.service.js';

const notificationRecord = {
  id: 'notification-1',
  userId: 'user-1',
  type: NotificationType.TASK_ASSIGNED,
  title: 'Task assigned to you',
  body: 'You were assigned to "Design landing page hero".',
  readAt: null,
  metadata: { taskId: 'task-1', projectId: 'project-1' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;

  const prisma = {
    notification: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    prisma.notification.create.mockResolvedValue(notificationRecord);
    prisma.notification.count.mockResolvedValue(1);
    prisma.notification.findMany.mockResolvedValue([notificationRecord]);
    prisma.notification.findFirst.mockResolvedValue(notificationRecord);
    prisma.notification.update.mockResolvedValue({
      ...notificationRecord,
      readAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    prisma.notification.updateMany.mockResolvedValue({ count: 2 });
    prisma.task.findMany.mockResolvedValue([]);

    const realtimeEmitter = {
      emitTaskReordered: vi.fn(),
      emitCommentCreated: vi.fn(),
      emitNotificationCreated: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RealtimeEmitterService, useValue: realtimeEmitter },
      ],
    }).compile();

    notificationsService = module.get(NotificationsService);
  });

  it('creates a notification', async () => {
    const notification = await notificationsService.create({
      userId: 'user-1',
      type: NotificationType.TASK_ASSIGNED,
      title: 'Task assigned to you',
      body: 'You were assigned to "Design landing page hero".',
      metadata: { taskId: 'task-1', projectId: 'project-1' },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned to you',
        body: 'You were assigned to "Design landing page hero".',
        metadata: { taskId: 'task-1', projectId: 'project-1' },
      },
    });
    expect(notification.type).toBe(NotificationType.TASK_ASSIGNED);
  });

  it('lists notifications for a user with pagination', async () => {
    const result = await notificationsService.findAllForUser('user-1', {
      page: 1,
      limit: 20,
    });

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: [{ createdAt: 'desc' }],
      skip: 0,
      take: 20,
    });
    expect(result.notifications).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('lists only unread notifications when unreadOnly is true', async () => {
    await notificationsService.findAllForUser('user-1', {
      page: 1,
      limit: 20,
      unreadOnly: true,
    });

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
    });
  });

  it('returns unread count for a user', async () => {
    const unreadCount = await notificationsService.getUnreadCount('user-1');

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
    });
    expect(unreadCount).toBe(1);
  });

  it('marks a notification as read', async () => {
    const notification = await notificationsService.markAsRead(
      'user-1',
      'notification-1',
    );

    expect(prisma.notification.update).toHaveBeenCalled();
    expect(notification.readAt).not.toBeNull();
  });

  it('returns an already-read notification without updating', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      ...notificationRecord,
      readAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const notification = await notificationsService.markAsRead(
      'user-1',
      'notification-1',
    );

    expect(prisma.notification.update).not.toHaveBeenCalled();
    expect(notification.readAt).not.toBeNull();
  });

  it('throws when marking a missing notification as read', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(
      notificationsService.markAsRead('user-1', 'missing-notification'),
    ).rejects.toEqual(
      new ApiException(
        'Notification not found',
        'NOTIFICATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      ),
    );
  });

  it('marks all unread notifications as read', async () => {
    const updatedCount = await notificationsService.markAllAsRead('user-1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(updatedCount).toBe(2);
  });
});
