import type {
  EditableProjectStatus,
  ProjectPriority,
  ProjectStatus,
} from '../models/project.model';

export const EDITABLE_PROJECT_STATUSES: EditableProjectStatus[] = [
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
];

export const PROJECT_PRIORITIES: ProjectPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

export type ProjectBadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

export function projectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'PLANNING':
      return 'Planning';
    case 'ACTIVE':
      return 'Active';
    case 'ON_HOLD':
      return 'On hold';
    case 'COMPLETED':
      return 'Completed';
    case 'ARCHIVED':
      return 'Archived';
  }
}

export function projectPriorityLabel(priority: ProjectPriority): string {
  switch (priority) {
    case 'LOW':
      return 'Low';
    case 'MEDIUM':
      return 'Medium';
    case 'HIGH':
      return 'High';
    case 'CRITICAL':
      return 'Critical';
  }
}

export function projectStatusBadgeTone(status: ProjectStatus): ProjectBadgeTone {
  switch (status) {
    case 'PLANNING':
      return 'info';
    case 'ACTIVE':
      return 'success';
    case 'ON_HOLD':
      return 'warning';
    case 'COMPLETED':
      return 'neutral';
    case 'ARCHIVED':
      return 'muted';
  }
}

export function projectPriorityBadgeTone(
  priority: ProjectPriority,
): ProjectBadgeTone {
  switch (priority) {
    case 'LOW':
      return 'muted';
    case 'MEDIUM':
      return 'info';
    case 'HIGH':
      return 'warning';
    case 'CRITICAL':
      return 'danger';
  }
}

export function toDateInputValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

export function formatProjectDueDate(dueDate: string | null): string | null {
  if (!dueDate) {
    return null;
  }

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
