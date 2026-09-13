import type { ActivityLog, Prisma } from '@prisma/client';
import type { TaskUserSummary } from './tasks.types.js';

export const ActivityAction = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
  TASK_PRIORITY_CHANGED: 'TASK_PRIORITY_CHANGED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  SUBTASK_COMPLETED: 'SUBTASK_COMPLETED',
} as const;

export type ActivityActionType =
  (typeof ActivityAction)[keyof typeof ActivityAction];

export type ActivityLogResponse = ActivityLog & {
  actor: TaskUserSummary;
};

export type RecordActivityInput = {
  taskId: string;
  actorId: string;
  action: ActivityActionType;
  metadata?: Prisma.InputJsonValue;
};
