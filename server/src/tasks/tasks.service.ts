import { HttpStatus, Injectable } from '@nestjs/common';
import {
  OrganizationRole,
  type Task,
  TaskStatus,
  type User,
} from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { canManageOrganizationMembers } from '../organizations/utils/organization-role.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { UsersService } from '../users/users.service.js';
import { ActivityAction } from './activity.types.js';
import { NotificationTriggersService } from '../notifications/notification-triggers.service.js';
import { RealtimeEmitterService } from '../realtime/realtime-emitter.service.js';
import { ActivityLogService } from './activity-log.service.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  PaginatedTasksResult,
  ReorderTaskItemInput,
  ReorderTasksResult,
  TaskResponse,
  TaskUserSummary,
  UpdateTaskInput,
} from './tasks.types.js';

const taskInclude = {
  assignee: true,
  reporter: true,
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationTriggersService: NotificationTriggersService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    projectId: string,
    input: CreateTaskInput,
  ): Promise<TaskResponse> {
    await this.assertCanMutateTasks(userId, organizationId, projectId);
    await this.assertProjectIsActive(organizationId, projectId);

    if (input.assigneeId) {
      await this.assertAssigneeIsOrganizationMember(
        organizationId,
        input.assigneeId,
      );
    }

    const status = input.status ?? TaskStatus.BACKLOG;
    const position = await this.getNextPosition(projectId, status);

    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description ?? '',
        status,
        priority: input.priority,
        assigneeId: input.assigneeId ?? null,
        reporterId: userId,
        dueDate: input.dueDate ?? null,
        position,
      },
      include: taskInclude,
    });

    await this.activityLogService.record({
      taskId: task.id,
      actorId: userId,
      action: ActivityAction.TASK_CREATED,
      metadata: { title: task.title },
    });

    if (task.assigneeId) {
      await this.activityLogService.record({
        taskId: task.id,
        actorId: userId,
        action: ActivityAction.TASK_ASSIGNED,
        metadata: { assigneeId: task.assigneeId },
      });

      const actorName = await this.getActorName(userId);
      await this.notificationTriggersService.notifyTaskAssigned({
        actorId: userId,
        assigneeId: task.assigneeId,
        organizationId,
        projectId,
        taskId: task.id,
        taskTitle: task.title,
        actorName,
      });
    }

    return this.toTaskResponse(task);
  }

  async findAllForProject(
    userId: string,
    organizationId: string,
    projectId: string,
    query: ListTasksQuery,
  ): Promise<PaginatedTasksResult> {
    await this.projectsService.assertCanAccessProject(
      userId,
      organizationId,
      projectId,
    );

    const search = query.search?.trim();
    const dueDateFilter = this.buildDueDateFilter(query.dueFrom, query.dueTo);
    const where = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(dueDateFilter ? { dueDate: dueDateFilter } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              {
                description: { contains: search, mode: 'insensitive' as const },
              },
              {
                assignee: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                assignee: {
                  email: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      tasks: tasks.map((task) => this.toTaskResponse(task)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    };
  }

  async findOneForProject(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskResponse> {
    await this.projectsService.assertCanAccessProject(
      userId,
      organizationId,
      projectId,
    );

    const task = await this.getTaskInProject(projectId, taskId);
    return this.toTaskResponse(task);
  }

  async update(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskResponse> {
    await this.assertCanMutateTasks(userId, organizationId, projectId);
    await this.assertProjectIsActive(organizationId, projectId);

    const existingTask = await this.getTaskInProject(projectId, taskId);

    if (input.assigneeId) {
      await this.assertAssigneeIsOrganizationMember(
        organizationId,
        input.assigneeId,
      );
    }

    const nextStatus = input.status ?? existingTask.status;
    const shouldReposition =
      input.status !== undefined && input.status !== existingTask.status;

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assigneeId !== undefined
          ? { assigneeId: input.assigneeId }
          : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(shouldReposition
          ? {
              position: await this.getNextPosition(projectId, nextStatus),
            }
          : {}),
      },
      include: taskInclude,
    });

    await this.recordTaskUpdateActivity(userId, existingTask, input);
    await this.dispatchTaskUpdateNotifications(
      userId,
      organizationId,
      projectId,
      existingTask,
      task,
      input,
    );

    return this.toTaskResponse(task);
  }

  async reorder(
    userId: string,
    organizationId: string,
    projectId: string,
    items: ReorderTaskItemInput[],
  ): Promise<ReorderTasksResult> {
    await this.assertCanMutateTasks(userId, organizationId, projectId);
    await this.assertProjectIsActive(organizationId, projectId);

    const uniqueTaskIds = new Set(items.map((item) => item.taskId));
    if (uniqueTaskIds.size !== items.length) {
      throw new ApiException(
        'Duplicate task ids in reorder request',
        'INVALID_REORDER',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingTasks = await this.prisma.task.findMany({
      where: {
        projectId,
        id: { in: [...uniqueTaskIds] },
      },
      include: taskInclude,
    });

    if (existingTasks.length !== items.length) {
      throw new ApiException(
        'One or more tasks were not found in this project',
        'TASK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const existingById = new Map(
      existingTasks.map((task) => [task.id, task] as const),
    );

    if (items.length === 1) {
      const [item] = items;
      const existingTask = existingById.get(item.taskId)!;

      await this.prisma.$transaction(async (tx) => {
        await this.applySingleTaskReorder(
          tx,
          projectId,
          existingTask,
          item.status,
          item.position,
        );
      });

      if (existingTask.status !== item.status) {
        await this.activityLogService.record({
          taskId: existingTask.id,
          actorId: userId,
          action: ActivityAction.TASK_STATUS_CHANGED,
          metadata: {
            from: existingTask.status,
            to: item.status,
          },
        });

        if (existingTask.assigneeId) {
          const actorName = await this.getActorName(userId);
          await this.notificationTriggersService.notifyTaskStatusChanged({
            actorId: userId,
            assigneeId: existingTask.assigneeId,
            organizationId,
            projectId,
            taskId: existingTask.id,
            taskTitle: existingTask.title,
            actorName,
            from: existingTask.status,
            to: item.status,
          });
        }
      }
    } else {
      this.assertBatchReorderPositions(items);

      await this.prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.task.update({
            where: { id: item.taskId },
            data: {
              status: item.status,
              position: item.position,
            },
          });
        }
      });

      for (const item of items) {
        const existingTask = existingById.get(item.taskId)!;
        if (existingTask.status !== item.status) {
          await this.activityLogService.record({
            taskId: item.taskId,
            actorId: userId,
            action: ActivityAction.TASK_STATUS_CHANGED,
            metadata: {
              from: existingTask.status,
              to: item.status,
            },
          });

          if (existingTask.assigneeId) {
            const actorName = await this.getActorName(userId);
            await this.notificationTriggersService.notifyTaskStatusChanged({
              actorId: userId,
              assigneeId: existingTask.assigneeId,
              organizationId,
              projectId,
              taskId: existingTask.id,
              taskTitle: existingTask.title,
              actorName,
              from: existingTask.status,
              to: item.status,
            });
          }
        }
      }
    }

    const updatedTasks = await this.prisma.task.findMany({
      where: {
        projectId,
        id: { in: [...uniqueTaskIds] },
      },
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    });

    const result = {
      tasks: updatedTasks.map((task) => this.toTaskResponse(task)),
    };

    this.realtimeEmitter.emitTaskReordered({
      actorId: userId,
      organizationId,
      projectId,
    });

    return result;
  }

  async remove(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    await this.ensureTaskMutationAccess(
      userId,
      organizationId,
      projectId,
      taskId,
    );

    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  async ensureTaskReadAccess(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskResponse> {
    await this.projectsService.assertCanAccessProject(
      userId,
      organizationId,
      projectId,
    );

    const task = await this.getTaskInProject(projectId, taskId);
    return this.toTaskResponse(task);
  }

  async ensureTaskMutationAccess(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskResponse> {
    await this.assertCanMutateTasks(userId, organizationId, projectId);
    await this.assertProjectIsActive(organizationId, projectId);

    const task = await this.getTaskInProject(projectId, taskId);
    return this.toTaskResponse(task);
  }

  private async assertCanMutateTasks(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const membership = await this.organizationsService.getMembershipForUser(
      userId,
      organizationId,
    );

    if (membership.role === OrganizationRole.VIEWER) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }

    if (canManageOrganizationMembers(membership.role)) {
      await this.projectsService.getProjectForOrganization(
        organizationId,
        projectId,
      );
      return;
    }

    await this.projectsService.assertCanAccessProject(
      userId,
      organizationId,
      projectId,
    );
  }

  private async assertProjectIsActive(
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.projectsService.getProjectForOrganization(
      organizationId,
      projectId,
    );

    if (project.archivedAt) {
      throw new ApiException(
        'Archived projects cannot be modified',
        'PROJECT_ARCHIVED',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async assertAssigneeIsOrganizationMember(
    organizationId: string,
    assigneeId: string,
  ): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: assigneeId,
        },
      },
    });

    if (!membership) {
      throw new ApiException(
        'Assignee must be a member of the organization',
        'INVALID_ASSIGNEE',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async getTaskInProject(projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      include: taskInclude,
    });

    if (!task) {
      throw new ApiException(
        'Task not found',
        'TASK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return task;
  }

  private assertBatchReorderPositions(items: ReorderTaskItemInput[]): void {
    const positionsByStatus = new Map<TaskStatus, Set<number>>();

    for (const item of items) {
      const positions = positionsByStatus.get(item.status) ?? new Set<number>();
      if (positions.has(item.position)) {
        throw new ApiException(
          'Duplicate positions within the same column',
          'INVALID_REORDER',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      positions.add(item.position);
      positionsByStatus.set(item.status, positions);
    }
  }

  private async applySingleTaskReorder(
    tx: Pick<PrismaService, 'task'>,
    projectId: string,
    existingTask: Task,
    newStatus: TaskStatus,
    newPosition: number,
  ): Promise<void> {
    const oldStatus = existingTask.status;
    const oldPosition = existingTask.position;

    if (oldStatus === newStatus && oldPosition === newPosition) {
      return;
    }

    if (oldStatus === newStatus) {
      if (oldPosition < newPosition) {
        await tx.task.updateMany({
          where: {
            projectId,
            status: newStatus,
            id: { not: existingTask.id },
            position: { gt: oldPosition, lte: newPosition },
          },
          data: { position: { decrement: 1 } },
        });
      } else {
        await tx.task.updateMany({
          where: {
            projectId,
            status: newStatus,
            id: { not: existingTask.id },
            position: { gte: newPosition, lt: oldPosition },
          },
          data: { position: { increment: 1 } },
        });
      }
    } else {
      await tx.task.updateMany({
        where: {
          projectId,
          status: oldStatus,
          position: { gt: oldPosition },
        },
        data: { position: { decrement: 1 } },
      });

      await tx.task.updateMany({
        where: {
          projectId,
          status: newStatus,
          position: { gte: newPosition },
        },
        data: { position: { increment: 1 } },
      });
    }

    await tx.task.update({
      where: { id: existingTask.id },
      data: {
        status: newStatus,
        position: newPosition,
      },
    });
  }

  private async getNextPosition(
    projectId: string,
    status: TaskStatus,
  ): Promise<number> {
    const result = await this.prisma.task.aggregate({
      where: { projectId, status },
      _max: { position: true },
    });

    return (result._max.position ?? -1) + 1;
  }

  private async getActorName(userId: string): Promise<string> {
    const actor = await this.usersService.findById(userId);
    return actor?.name ?? 'Someone';
  }

  private async dispatchTaskUpdateNotifications(
    userId: string,
    organizationId: string,
    projectId: string,
    existingTask: Task,
    updatedTask: Task,
    input: UpdateTaskInput,
  ): Promise<void> {
    const actorName = await this.getActorName(userId);

    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== existingTask.assigneeId &&
      input.assigneeId
    ) {
      await this.notificationTriggersService.notifyTaskAssigned({
        actorId: userId,
        assigneeId: input.assigneeId,
        organizationId,
        projectId,
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        actorName,
      });
    }

    if (
      input.status !== undefined &&
      input.status !== existingTask.status &&
      updatedTask.assigneeId
    ) {
      await this.notificationTriggersService.notifyTaskStatusChanged({
        actorId: userId,
        assigneeId: updatedTask.assigneeId,
        organizationId,
        projectId,
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        actorName,
        from: existingTask.status,
        to: input.status,
      });
    }
  }

  private async recordTaskUpdateActivity(
    userId: string,
    existingTask: Task,
    input: UpdateTaskInput,
  ): Promise<void> {
    if (
      input.status !== undefined &&
      input.status !== existingTask.status
    ) {
      await this.activityLogService.record({
        taskId: existingTask.id,
        actorId: userId,
        action: ActivityAction.TASK_STATUS_CHANGED,
        metadata: {
          from: existingTask.status,
          to: input.status,
        },
      });
    }

    if (
      input.priority !== undefined &&
      input.priority !== existingTask.priority
    ) {
      await this.activityLogService.record({
        taskId: existingTask.id,
        actorId: userId,
        action: ActivityAction.TASK_PRIORITY_CHANGED,
        metadata: {
          from: existingTask.priority,
          to: input.priority,
        },
      });
    }

    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== existingTask.assigneeId
    ) {
      await this.activityLogService.record({
        taskId: existingTask.id,
        actorId: userId,
        action: ActivityAction.TASK_ASSIGNED,
        metadata: {
          assigneeId: input.assigneeId,
          previousAssigneeId: existingTask.assigneeId,
        },
      });
    }
  }

  private buildDueDateFilter(
    dueFrom?: string,
    dueTo?: string,
  ): { gte?: Date; lte?: Date } | null {
    if (!dueFrom && !dueTo) {
      return null;
    }

    if (dueFrom && dueTo && dueFrom > dueTo) {
      throw new ApiException(
        'dueFrom must be on or before dueTo',
        'VALIDATION_ERROR',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return {
      ...(dueFrom ? { gte: new Date(`${dueFrom}T00:00:00.000Z`) } : {}),
      ...(dueTo ? { lte: new Date(`${dueTo}T23:59:59.999Z`) } : {}),
    };
  }

  private toTaskResponse(
    task: Task & { assignee: User | null; reporter: User },
  ): TaskResponse {
    return {
      ...task,
      assignee: task.assignee
        ? this.toTaskUserSummary(task.assignee)
        : null,
      reporter: this.toTaskUserSummary(task.reporter),
    };
  }

  private toTaskUserSummary(user: User): TaskUserSummary {
    const safeUser = this.usersService.toSafeUser(user);
    return {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      avatarUrl: safeUser.avatarUrl,
    };
  }
}
