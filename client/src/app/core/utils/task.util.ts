import type { TaskPriority, TaskStatus, TaskSummary } from '../models/task.model';
import type { ProjectBadgeTone } from './project.util';
import { projectPriorityLabel, projectPriorityBadgeTone } from './project.util';

export const TASK_STATUSES: TaskStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
];

export const TASK_PRIORITIES: TaskPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'BACKLOG':
      return 'Backlog';
    case 'TODO':
      return 'Todo';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'REVIEW':
      return 'Review';
    case 'DONE':
      return 'Done';
  }
}

export function taskPriorityLabel(priority: TaskPriority): string {
  return projectPriorityLabel(priority);
}

export function taskStatusBadgeTone(status: TaskStatus): ProjectBadgeTone {
  switch (status) {
    case 'BACKLOG':
      return 'muted';
    case 'TODO':
      return 'info';
    case 'IN_PROGRESS':
      return 'warning';
    case 'REVIEW':
      return 'neutral';
    case 'DONE':
      return 'success';
  }
}

export function taskPriorityBadgeTone(priority: TaskPriority): ProjectBadgeTone {
  return projectPriorityBadgeTone(priority);
}

export function formatTaskDueDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function toDateInputValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

export function groupTasksByStatus(
  tasks: TaskSummary[],
): Record<TaskStatus, TaskSummary[]> {
  const grouped = Object.fromEntries(
    TASK_STATUSES.map((status) => [status, [] as TaskSummary[]]),
  ) as Record<TaskStatus, TaskSummary[]>;

  for (const task of tasks) {
    grouped[task.status].push(task);
  }

  for (const status of TASK_STATUSES) {
    grouped[status].sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position;
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
  }

  return grouped;
}

export function taskMatchesQuery(
  task: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string | null;
    assignee?: { name: string; email: string } | null;
  },
  query: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    search?: string;
  },
): boolean {
  if (query.status && task.status !== query.status) {
    return false;
  }

  if (query.priority && task.priority !== query.priority) {
    return false;
  }

  if (query.assigneeId && task.assigneeId !== query.assigneeId) {
    return false;
  }

  const search = query.search?.trim().toLowerCase();
  if (search) {
    const haystack = [
      task.title,
      task.description,
      task.assignee?.name ?? '',
      task.assignee?.email ?? '',
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(search)) {
      return false;
    }
  }

  return true;
}
