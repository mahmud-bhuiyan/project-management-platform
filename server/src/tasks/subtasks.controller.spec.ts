import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { SubtasksController } from './subtasks.controller.js';
import { SubtasksService } from './subtasks.service.js';

const subtask = {
  id: 'subtask-1',
  taskId: 'task-1',
  title: 'Draft wireframes',
  completed: false,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('SubtasksController', () => {
  let subtasksController: SubtasksController;

  const subtasksService = {
    create: vi.fn(),
    findAllForTask: vi.fn(),
    findOneForTask: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const createAuthenticatedRequest = () =>
    ({
      user: {
        id: 'user-1',
        email: 'admin@acme.com',
        platformRole: 'USER',
      },
    }) as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    subtasksService.create.mockResolvedValue(subtask);
    subtasksService.findAllForTask.mockResolvedValue([subtask]);
    subtasksService.findOneForTask.mockResolvedValue(subtask);
    subtasksService.update.mockResolvedValue({ ...subtask, completed: true });
    subtasksService.remove.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubtasksController],
      providers: [
        { provide: SubtasksService, useValue: subtasksService },
        {
          provide: JwtService,
          useValue: { verify: vi.fn(), sign: vi.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    subtasksController = module.get(SubtasksController);
  });

  it('creates a subtask', async () => {
    const response = await subtasksController.create(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
      { title: 'Draft wireframes' },
    );

    expect(subtasksService.create).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      { title: 'Draft wireframes', position: undefined },
    );
    expect(response.data).toEqual({ subtask });
  });

  it('lists subtasks', async () => {
    const response = await subtasksController.findAll(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
    );

    expect(response.data).toEqual({ subtasks: [subtask] });
  });

  it('updates subtask completion', async () => {
    const response = await subtasksController.update(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
      'subtask-1',
      { completed: true },
    );

    expect(subtasksService.update).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      'subtask-1',
      { title: undefined, completed: true, position: undefined },
    );
    expect(response.data).toEqual({ subtask: { ...subtask, completed: true } });
  });

  it('deletes a subtask', async () => {
    const response = await subtasksController.remove(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
      'subtask-1',
    );

    expect(subtasksService.remove).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      'subtask-1',
    );
    expect(response.data).toBeNull();
    expect(response.message).toBe('Subtask deleted successfully');
  });
});
