import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { SubtasksService } from './subtasks.service.js';
import { TasksService } from './tasks.service.js';

const subtaskRecord = {
  id: 'subtask-1',
  taskId: 'task-1',
  title: 'Draft wireframes',
  completed: false,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('SubtasksService', () => {
  let subtasksService: SubtasksService;

  const tasksService = {
    ensureTaskReadAccess: vi.fn(),
    ensureTaskMutationAccess: vi.fn(),
  };

  const activityLogService = {
    record: vi.fn(),
  };

  const tx = {
    subtask: {
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const prisma = {
    $transaction: vi.fn(),
    subtask: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    tasksService.ensureTaskReadAccess.mockResolvedValue({ id: 'task-1' });
    tasksService.ensureTaskMutationAccess.mockResolvedValue({ id: 'task-1' });
    prisma.subtask.aggregate.mockResolvedValue({ _max: { position: 0 } });
    prisma.subtask.create.mockResolvedValue(subtaskRecord);
    prisma.subtask.findMany.mockResolvedValue([subtaskRecord]);
    prisma.subtask.findFirst.mockResolvedValue(subtaskRecord);
    prisma.subtask.update.mockResolvedValue({
      ...subtaskRecord,
      completed: true,
    });
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    tx.subtask.delete.mockResolvedValue(subtaskRecord);
    tx.subtask.updateMany.mockResolvedValue({ count: 1 });
    prisma.subtask.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubtasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: TasksService, useValue: tasksService },
        { provide: ActivityLogService, useValue: activityLogService },
      ],
    }).compile();

    subtasksService = module.get(SubtasksService);
  });

  it('creates a subtask with the next position', async () => {
    const subtask = await subtasksService.create(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      { title: 'Draft wireframes' },
    );

    expect(tasksService.ensureTaskMutationAccess).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
    );
    expect(prisma.subtask.create).toHaveBeenCalledWith({
      data: {
        taskId: 'task-1',
        title: 'Draft wireframes',
        position: 1,
      },
    });
    expect(subtask).toEqual(subtaskRecord);
  });

  it('lists subtasks for a task', async () => {
    const subtasks = await subtasksService.findAllForTask(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
    );

    expect(tasksService.ensureTaskReadAccess).toHaveBeenCalled();
    expect(subtasks).toEqual([subtaskRecord]);
  });

  it('updates subtask completion', async () => {
    const subtask = await subtasksService.update(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      'subtask-1',
      { completed: true },
    );

    expect(prisma.subtask.update).toHaveBeenCalledWith({
      where: { id: 'subtask-1' },
      data: { completed: true },
    });
    expect(subtask.completed).toBe(true);
  });

  it('throws when subtask is not found', async () => {
    prisma.subtask.findFirst.mockResolvedValue(null);

    await expect(
      subtasksService.findOneForTask(
        'user-1',
        'org-1',
        'project-1',
        'task-1',
        'missing',
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'SUBTASK_NOT_FOUND',
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('blocks mutations when task access is denied', async () => {
    tasksService.ensureTaskMutationAccess.mockRejectedValue(
      new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      ),
    );

    await expect(
      subtasksService.create('viewer-1', 'org-1', 'project-1', 'task-1', {
        title: 'Blocked',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('deletes a subtask and compacts positions', async () => {
    await subtasksService.remove(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      'subtask-1',
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.subtask.delete).toHaveBeenCalledWith({
      where: { id: 'subtask-1' },
    });
    expect(tx.subtask.updateMany).toHaveBeenCalledWith({
      where: {
        taskId: 'task-1',
        position: { gt: 0 },
      },
      data: { position: { decrement: 1 } },
    });
  });
});
