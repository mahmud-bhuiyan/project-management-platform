import type { TaskUserSummary } from './task.model';

export type SubtaskSummary = {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type SubtasksResponseData = {
  subtasks: SubtaskSummary[];
};

export type SubtaskResponseData = {
  subtask: SubtaskSummary;
};

export type CreateSubtaskInput = {
  title: string;
};

export type UpdateSubtaskInput = {
  title?: string;
  completed?: boolean;
};

export type CommentSummary = {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: TaskUserSummary;
};

export type CommentsResponseData = {
  comments: CommentSummary[];
};

export type CommentResponseData = {
  comment: CommentSummary;
};

export type CreateCommentInput = {
  body: string;
};

export type UpdateCommentInput = {
  body: string;
};

export type ActivityActionType =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_PRIORITY_CHANGED'
  | 'COMMENT_ADDED'
  | 'SUBTASK_COMPLETED';

export type ActivityEntry = {
  id: string;
  taskId: string;
  actorId: string;
  action: ActivityActionType;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: TaskUserSummary;
};

export type ActivityResponseData = {
  activity: ActivityEntry[];
};
