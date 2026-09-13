import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { NotificationType } from './notification.types.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

const notification = {
  id: 'notification-1',
  userId: 'user-1',
  type: NotificationType.TASK_ASSIGNED,
  title: 'Task assigned to you',
  body: 'You were assigned to "Design landing page hero".',
  readAt: null,
  metadata: { taskId: 'task-1' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('NotificationsController', () => {
  let notificationsController: NotificationsController;

  const notificationsService = {
    findAllForUser: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  };

  const createAuthenticatedRequest = () =>
    ({
      user: {
        id: 'user-1',
        email: 'admin@acme.dev',
        platformRole: 'USER',
      },
    }) as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();

    notificationsService.findAllForUser.mockResolvedValue({
      notifications: [notification],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    notificationsService.getUnreadCount.mockResolvedValue(3);
    notificationsService.markAsRead.mockResolvedValue({
      ...notification,
      readAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    notificationsService.markAllAsRead.mockResolvedValue(2);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsService },
        {
          provide: JwtService,
          useValue: { verify: vi.fn(), sign: vi.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    notificationsController = module.get(NotificationsController);
  });

  it('lists notifications for the current user', async () => {
    const response = await notificationsController.findAll(
      createAuthenticatedRequest(),
      { page: 1, limit: 20 },
    );

    expect(notificationsService.findAllForUser).toHaveBeenCalledWith('user-1', {
      page: 1,
      limit: 20,
      unreadOnly: undefined,
    });
    expect(response.data.notifications).toHaveLength(1);
    expect(response.meta?.total).toBe(1);
  });

  it('returns unread count for the current user', async () => {
    const response = await notificationsController.getUnreadCount(
      createAuthenticatedRequest(),
    );

    expect(notificationsService.getUnreadCount).toHaveBeenCalledWith('user-1');
    expect(response.data.unreadCount).toBe(3);
  });

  it('marks a notification as read', async () => {
    const response = await notificationsController.markAsRead(
      createAuthenticatedRequest(),
      'notification-1',
    );

    expect(notificationsService.markAsRead).toHaveBeenCalledWith(
      'user-1',
      'notification-1',
    );
    expect(response.data.notification.readAt).not.toBeNull();
  });

  it('marks all notifications as read', async () => {
    const response = await notificationsController.markAllAsRead(
      createAuthenticatedRequest(),
    );

    expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('user-1');
    expect(response.data.updatedCount).toBe(2);
  });
});
