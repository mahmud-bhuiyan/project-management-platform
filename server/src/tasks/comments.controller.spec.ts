import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.types.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

const comment = {
  id: 'comment-1',
  taskId: 'task-1',
  authorId: 'user-1',
  body: 'Looks good — please add mobile breakpoints.',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  author: {
    id: 'user-1',
    name: 'Acme Admin',
    email: 'admin@acme.dev',
    avatarUrl: null,
  },
};

describe('CommentsController', () => {
  let commentsController: CommentsController;

  const commentsService = {
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
    commentsService.create.mockResolvedValue(comment);
    commentsService.findAllForTask.mockResolvedValue([comment]);
    commentsService.findOneForTask.mockResolvedValue(comment);
    commentsService.update.mockResolvedValue({
      ...comment,
      body: 'Updated comment body',
    });
    commentsService.remove.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentsService, useValue: commentsService },
        {
          provide: JwtService,
          useValue: { verify: vi.fn(), sign: vi.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    commentsController = module.get(CommentsController);
  });

  it('creates a comment', async () => {
    const response = await commentsController.create(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
      { body: 'Looks good — please add mobile breakpoints.' },
    );

    expect(commentsService.create).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      { body: 'Looks good — please add mobile breakpoints.' },
    );
    expect(response.data).toEqual({ comment });
  });

  it('lists comments', async () => {
    const response = await commentsController.findAll(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
    );

    expect(response.data).toEqual({ comments: [comment] });
  });

  it('updates a comment', async () => {
    const response = await commentsController.update(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
      'comment-1',
      { body: 'Updated comment body' },
    );

    expect(response.data).toEqual({
      comment: { ...comment, body: 'Updated comment body' },
    });
  });

  it('deletes a comment', async () => {
    const response = await commentsController.remove(
      createAuthenticatedRequest(),
      'org-1',
      'project-1',
      'task-1',
      'comment-1',
    );

    expect(commentsService.remove).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'task-1',
      'comment-1',
    );
    expect(response.data).toBeNull();
    expect(response.message).toBe('Comment deleted successfully');
  });
});
