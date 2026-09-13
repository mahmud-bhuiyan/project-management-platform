import type { ActivityEntry } from '../models/task-detail.model';
import type { TaskPriority, TaskStatus, TaskUserSummary } from '../models/task.model';
import { taskPriorityLabel, taskStatusLabel } from './task.util';

function memberName(
  userId: string | null | undefined,
  membersById: Map<string, TaskUserSummary>,
): string | null {
  if (!userId) {
    return null;
  }

  return membersById.get(userId)?.name ?? null;
}

export function formatActivityMessage(
  entry: ActivityEntry,
  membersById: Map<string, TaskUserSummary>,
): string {
  const actor = entry.actor.name;
  const metadata = entry.metadata;

  switch (entry.action) {
    case 'TASK_CREATED':
      return `${actor} created this task.`;
    case 'TASK_ASSIGNED': {
      const assigneeName = memberName(String(metadata['assigneeId'] ?? ''), membersById);
      return assigneeName
        ? `${actor} assigned this task to ${assigneeName}.`
        : `${actor} updated the assignee.`;
    }
    case 'TASK_STATUS_CHANGED':
      return `${actor} moved this task from ${taskStatusLabel(metadata['from'] as TaskStatus)} to ${taskStatusLabel(metadata['to'] as TaskStatus)}.`;
    case 'TASK_PRIORITY_CHANGED':
      return `${actor} changed priority from ${taskPriorityLabel(metadata['from'] as TaskPriority)} to ${taskPriorityLabel(metadata['to'] as TaskPriority)}.`;
    case 'COMMENT_ADDED':
      return `${actor} added a comment.`;
    case 'SUBTASK_COMPLETED':
      return `${actor} completed subtask "${String(metadata['title'] ?? 'Subtask')}".`;
    default:
      return `${actor} updated this task.`;
  }
}
