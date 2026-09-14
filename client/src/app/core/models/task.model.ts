import type { ProjectPriority } from './project.model';

export type TaskStatus =
  | 'BACKLOG'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE';

export type TaskPriority = ProjectPriority;

export type TaskUserSummary = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type TaskSummary = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee: TaskUserSummary | null;
  reporter: TaskUserSummary;
};

export type TasksResponseData = {
  tasks: TaskSummary[];
};

export type TaskResponseData = {
  task: TaskSummary;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export type TasksQuery = {
  page: number;
  limit: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
};

export type ReorderTaskItemInput = {
  taskId: string;
  status: TaskStatus;
  position: number;
};

export type ReorderTasksResponseData = {
  tasks: TaskSummary[];
};
