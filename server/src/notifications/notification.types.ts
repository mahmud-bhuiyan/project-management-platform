import type { Notification, Prisma } from '@prisma/client';

export const NotificationType = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  MENTION: 'MENTION',
  TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export type NotificationMetadata = Prisma.JsonObject;

export type NotificationResponse = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  metadata: NotificationMetadata;
  createdAt: Date;
};

export type ListNotificationsQuery = {
  page: number;
  limit: number;
  unreadOnly?: boolean;
};

export type ListNotificationsResult = {
  notifications: NotificationResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationTypeValue | string;
  title: string;
  body: string;
  metadata?: NotificationMetadata;
};

export type NotificationRecord = Notification;
