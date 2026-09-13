import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

const task = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Design landing page hero',
  description: 'Include responsive breakpoints.',
  status: TaskStatus.BACKLOG,
  priority: TaskPriority.MEDIUM,
  assigneeId: null,
  reporterId: 'user-1',
  dueDate: null,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  assignee: null,
  reporter: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('TasksController', () => {
  let tasksController: TasksController;

  const tasksService = {
    create: vi.fn(),
    findAllForProject: vi.fn(),
    findOneForProject: vi.fn(),
    reorder: vi.fn(),
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
    tasksService.create.mockResolvedValue(task);
    tasksService.findAllForProject.mockResolvedValue({
      tasks: [task],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    tasksService.findOneForProject.mockResolvedValue(task);
    tasksService.update.mockResolvedValue({
      ...task,
      status: TaskStatus.IN_PROGRESS,
    });
    tasksService.reorder.mockResolvedValue({
      tasks: [{ ...task, status: TaskStatus.IN_PROGRESS, position: 0 }],
    });
    tasksService.remove.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: tasksService },
        {
          provide: JwtService,
          useValue: { verify: vi.fn(), sign: vi.fn() },
        },
        JwtAuthGuard,
      ],
    }).compile();

    tasksController = module.get(TasksController);
  });

  it('creates a task', async () => {
    const response = await tasksController.create(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      {
        title: 'Design landing page hero',
        description: 'Include responsive breakpoints.',
      },
    );

    expect(response.data).toEqual({ task });
    expect(tasksService.create).toHaveBeenCalled();
  });

  it('lists tasks with pagination meta', async () => {
    const response = await tasksController.findAll(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      { page: 1, limit: 20, status: TaskStatus.BACKLOG },
    );

    expect(response.data).toEqual({ tasks: [task] });
    expect(response.meta).toEqual({
      page: 1,
      perPage: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('reorders tasks on the Kanban board', async () => {
    const response = await tasksController.reorder(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      {
        items: [
          {
            taskId: 'task-1',
            status: TaskStatus.IN_PROGRESS,
            position: 0,
          },
        ],
      },
    );

    expect(response.data).toEqual({
      tasks: [{ ...task, status: TaskStatus.IN_PROGRESS, position: 0 }],
    });
    expect(tasksService.reorder).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      [
        {
          taskId: 'task-1',
          status: TaskStatus.IN_PROGRESS,
          position: 0,
        },
      ],
    );
  });
});
