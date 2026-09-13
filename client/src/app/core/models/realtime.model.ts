import type { CommentSummary } from './task-detail.model';
import type { NotificationSummary } from './notification.model';

export const RealtimeEvent = {
  TaskReordered: 'task:reordered',
  CommentCreated: 'comment:created',
  NotificationCreated: 'notification:created',
} as const;

export type TaskReorderedEvent = {
  actorId: string;
  organizationId: string;
  projectId: string;
};

export type CommentCreatedEvent = {
  actorId: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  comment: CommentSummary;
};

export type NotificationCreatedEvent = {
  notification: NotificationSummary;
};
