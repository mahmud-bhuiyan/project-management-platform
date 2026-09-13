import type { NotificationResponse } from '../notifications/notification.types.js';
import type { CommentResponse } from '../tasks/comments.types.js';

export const RealtimeEvent = {
  TaskReordered: 'task:reordered',
  CommentCreated: 'comment:created',
  NotificationCreated: 'notification:created',
} as const;

export type TaskReorderedPayload = {
  actorId: string;
  organizationId: string;
  projectId: string;
};

export type CommentCreatedPayload = {
  actorId: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  comment: CommentResponse;
};

export type NotificationCreatedPayload = {
  notification: NotificationResponse;
};
