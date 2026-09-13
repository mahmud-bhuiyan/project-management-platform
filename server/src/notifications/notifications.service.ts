import { HttpStatus, Injectable } from '@nestjs/common';
import type { Notification, Prisma } from '@prisma/client';
import { TaskStatus } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeEmitterService } from '../realtime/realtime-emitter.service.js';
import type {
  CreateNotificationInput,
  ListNotificationsQuery,
  ListNotificationsResult,
  NotificationMetadata,
  NotificationResponse,
} from './notification.types.js';
import { NotificationType } from './notification.types.js';

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    const response = this.toNotificationResponse(notification);

    this.realtimeEmitter.emitNotificationCreated({ notification: response });

    return response;
  }

  async findAllForUser(
    userId: string,
    query: ListNotificationsQuery,
  ): Promise<ListNotificationsResult> {
    await this.ensureDueSoonNotifications(userId);

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      notifications: notifications.map((notification) =>
        this.toNotificationResponse(notification),
      ),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    await this.ensureDueSoonNotifications(userId);

    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new ApiException(
        'Notification not found',
        'NOTIFICATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    if (notification.readAt) {
      return this.toNotificationResponse(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });

    return this.toNotificationResponse(updated);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return result.count;
  }

  async ensureDueSoonNotifications(userId: string): Promise<void> {
    const dueBefore = new Date(Date.now() + DUE_SOON_WINDOW_MS);

    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { not: null, lte: dueBefore },
        status: { not: TaskStatus.DONE },
      },
      include: {
        project: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    for (const task of tasks) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: NotificationType.TASK_DUE_SOON,
          metadata: {
            path: ['taskId'],
            equals: task.id,
          },
        },
      });

      if (existing) {
        continue;
      }

      await this.create({
        userId,
        type: NotificationType.TASK_DUE_SOON,
        title: 'Task due soon',
        body: `"${task.title}" is due within 24 hours.`,
        metadata: {
          organizationId: task.project.organizationId,
          projectId: task.project.id,
          taskId: task.id,
        },
      });
    }
  }

  private toNotificationResponse(
    notification: Notification,
  ): NotificationResponse {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      readAt: notification.readAt,
      metadata: notification.metadata as NotificationMetadata,
      createdAt: notification.createdAt,
    };
  }
}
