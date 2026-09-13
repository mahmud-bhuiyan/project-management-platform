import { HttpStatus, Injectable } from '@nestjs/common';
import type { Comment, User } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { ActivityAction } from './activity.types.js';
import { ActivityLogService } from './activity-log.service.js';
import type {
  CommentResponse,
  CreateCommentInput,
  UpdateCommentInput,
} from './comments.types.js';
import { TasksService } from './tasks.service.js';
import type { TaskUserSummary } from './tasks.types.js';

const commentInclude = {
  author: true,
} as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    input: CreateCommentInput,
  ): Promise<CommentResponse> {
    await this.tasksService.ensureTaskMutationAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const comment = await this.prisma.comment.create({
      data: {
        taskId,
        authorId: userId,
        body: input.body,
      },
      include: commentInclude,
    });

    await this.activityLogService.record({
      taskId,
      actorId: userId,
      action: ActivityAction.COMMENT_ADDED,
      metadata: {
        commentId: comment.id,
        body: comment.body,
      },
    });

    return this.toCommentResponse(comment);
  }

  async findAllForTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<CommentResponse[]> {
    await this.tasksService.ensureTaskReadAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const comments = await this.prisma.comment.findMany({
      where: { taskId },
      include: commentInclude,
      orderBy: [{ createdAt: 'asc' }],
    });

    return comments.map((comment) => this.toCommentResponse(comment));
  }

  async findOneForTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
  ): Promise<CommentResponse> {
    await this.tasksService.ensureTaskReadAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const comment = await this.getCommentInTask(taskId, commentId);
    return this.toCommentResponse(comment);
  }

  async update(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
    input: UpdateCommentInput,
  ): Promise<CommentResponse> {
    await this.tasksService.ensureTaskMutationAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const existingComment = await this.getCommentInTask(taskId, commentId);
    this.assertIsAuthor(userId, existingComment);

    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { body: input.body },
      include: commentInclude,
    });

    return this.toCommentResponse(comment);
  }

  async remove(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
  ): Promise<void> {
    await this.tasksService.ensureTaskMutationAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const existingComment = await this.getCommentInTask(taskId, commentId);
    this.assertIsAuthor(userId, existingComment);

    await this.prisma.comment.delete({
      where: { id: commentId },
    });
  }

  private async getCommentInTask(taskId: string, commentId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      include: commentInclude,
    });

    if (!comment) {
      throw new ApiException(
        'Comment not found',
        'COMMENT_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return comment;
  }

  private assertIsAuthor(userId: string, comment: Comment): void {
    if (comment.authorId !== userId) {
      throw new ApiException(
        'You can only modify your own comments',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private toCommentResponse(
    comment: Comment & { author: User },
  ): CommentResponse {
    const safeAuthor = this.usersService.toSafeUser(comment.author);

    return {
      ...comment,
      author: this.toAuthorSummary(safeAuthor),
    };
  }

  private toAuthorSummary(user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  }): TaskUserSummary {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }
}
