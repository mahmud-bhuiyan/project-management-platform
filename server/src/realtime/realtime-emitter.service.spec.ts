import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeEvent } from './realtime.events.js';
import { RealtimeEmitterService } from './realtime-emitter.service.js';

describe('RealtimeEmitterService', () => {
  let emitter: RealtimeEmitterService;

  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));

  beforeEach(() => {
    vi.clearAllMocks();
    emitter = new RealtimeEmitterService();
    emitter.setServer({ to } as never);
  });

  it('emits task reordered events to the project room', () => {
    const payload = {
      actorId: 'user-1',
      organizationId: 'org-1',
      projectId: 'project-1',
    };

    emitter.emitTaskReordered(payload);

    expect(to).toHaveBeenCalledWith('project:project-1');
    expect(emit).toHaveBeenCalledWith(RealtimeEvent.TaskReordered, payload);
  });

  it('emits comment created events to the project room', () => {
    const payload = {
      actorId: 'user-1',
      organizationId: 'org-1',
      projectId: 'project-1',
      taskId: 'task-1',
      comment: {
        id: 'comment-1',
        taskId: 'task-1',
        authorId: 'user-1',
        body: 'Looks good',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        author: {
          id: 'user-1',
          name: 'Admin',
          email: 'admin@acme.dev',
          avatarUrl: null,
        },
      },
    };

    emitter.emitCommentCreated(payload);

    expect(to).toHaveBeenCalledWith('project:project-1');
    expect(emit).toHaveBeenCalledWith(RealtimeEvent.CommentCreated, payload);
  });

  it('emits notification created events to the user room', () => {
    const payload = {
      notification: {
        id: 'notification-1',
        userId: 'user-2',
        type: 'TASK_ASSIGNED',
        title: 'Task assigned',
        body: 'You were assigned a task',
        readAt: null,
        metadata: {},
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    };

    emitter.emitNotificationCreated(payload);

    expect(to).toHaveBeenCalledWith('user:user-2');
    expect(emit).toHaveBeenCalledWith(
      RealtimeEvent.NotificationCreated,
      payload,
    );
  });
});
