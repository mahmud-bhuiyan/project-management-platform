import { describe, expect, it } from 'vitest';
import type { ActivityEntry } from '../models/task-detail.model';
import { formatActivityMessage } from './activity-message.util';

describe('formatActivityMessage', () => {
  it('formats status change activity', () => {
    const entry: ActivityEntry = {
      id: 'activity-1',
      taskId: 'task-1',
      actorId: 'user-1',
      action: 'TASK_STATUS_CHANGED',
      metadata: { from: 'TODO', to: 'IN_PROGRESS' },
      createdAt: '2026-01-01T00:00:00.000Z',
      actor: {
        id: 'user-1',
        name: 'Alex',
        email: 'alex@acme.dev',
        avatarUrl: null,
      },
    };

    expect(formatActivityMessage(entry, new Map())).toBe(
      'Alex moved this task from Todo to In progress.',
    );
  });
});
