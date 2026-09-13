import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityAction } from './activity.types.js';
import { ActivityLogService } from './activity-log.service.js';
import { TasksService } from './tasks.service.js';
import type {
  CreateSubtaskInput,
  SubtaskResponse,
  UpdateSubtaskInput,
} from './subtasks.types.js';

@Injectable()
export class SubtasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    input: CreateSubtaskInput,
  ): Promise<SubtaskResponse> {
    await this.tasksService.ensureTaskMutationAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const position =
      input.position ?? (await this.getNextPosition(taskId));

    const subtask = await this.prisma.subtask.create({
      data: {
        taskId,
        title: input.title,
        position,
      },
    });

    return subtask;
  }

  async findAllForTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<SubtaskResponse[]> {
    await this.tasksService.ensureTaskReadAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const subtasks = await this.prisma.subtask.findMany({
      where: { taskId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return subtasks;
  }

  async findOneForTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
  ): Promise<SubtaskResponse> {
    await this.tasksService.ensureTaskReadAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    return this.getSubtaskInTask(taskId, subtaskId);
  }

  async update(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
    input: UpdateSubtaskInput,
  ): Promise<SubtaskResponse> {
    await this.tasksService.ensureTaskMutationAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const existingSubtask = await this.getSubtaskInTask(taskId, subtaskId);

    if (
      input.position !== undefined &&
      input.position !== existingSubtask.position
    ) {
      await this.repositionSubtask(
        taskId,
        existingSubtask.id,
        existingSubtask.position,
        input.position,
      );
    }

    const subtask = await this.prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.completed !== undefined ? { completed: input.completed } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
      },
    });

    if (
      input.completed === true &&
      !existingSubtask.completed
    ) {
      await this.activityLogService.record({
        taskId,
        actorId: userId,
        action: ActivityAction.SUBTASK_COMPLETED,
        metadata: {
          subtaskId: subtask.id,
          title: subtask.title,
        },
      });
    }

    return subtask;
  }

  async remove(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
  ): Promise<void> {
    await this.tasksService.ensureTaskMutationAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    const existingSubtask = await this.getSubtaskInTask(taskId, subtaskId);

    await this.prisma.$transaction(async (tx) => {
      await tx.subtask.delete({
        where: { id: subtaskId },
      });

      await tx.subtask.updateMany({
        where: {
          taskId,
          position: { gt: existingSubtask.position },
        },
        data: { position: { decrement: 1 } },
      });
    });
  }

  private async getSubtaskInTask(taskId: string, subtaskId: string) {
    const subtask = await this.prisma.subtask.findFirst({
      where: {
        id: subtaskId,
        taskId,
      },
    });

    if (!subtask) {
      throw new ApiException(
        'Subtask not found',
        'SUBTASK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return subtask;
  }

  private async getNextPosition(taskId: string): Promise<number> {
    const result = await this.prisma.subtask.aggregate({
      where: { taskId },
      _max: { position: true },
    });

    return (result._max.position ?? -1) + 1;
  }

  private async repositionSubtask(
    taskId: string,
    subtaskId: string,
    oldPosition: number,
    newPosition: number,
  ): Promise<void> {
    if (oldPosition === newPosition) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      if (oldPosition < newPosition) {
        await tx.subtask.updateMany({
          where: {
            taskId,
            id: { not: subtaskId },
            position: { gt: oldPosition, lte: newPosition },
          },
          data: { position: { decrement: 1 } },
        });
      } else {
        await tx.subtask.updateMany({
          where: {
            taskId,
            id: { not: subtaskId },
            position: { gte: newPosition, lt: oldPosition },
          },
          data: { position: { increment: 1 } },
        });
      }
    });
  }
}
