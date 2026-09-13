import type { Task, TaskPriority, TaskStatus } from '@prisma/client';
import type { SafeUser } from '../users/users.types.js';

export type TaskUserSummary = Pick<
  SafeUser,
  'id' | 'name' | 'email' | 'avatarUrl'
>;

export type TaskResponse = Task & {
  assignee: TaskUserSummary | null;
  reporter: TaskUserSummary;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: Date | null;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: Date | null;
};

export type ListTasksQuery = {
  page: number;
  limit: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
};

export type PaginatedTasksResult = {
  tasks: TaskResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
