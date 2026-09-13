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
import type {
  CreateTaskInput,
  ListTasksQuery,
  PaginatedTasksResult,
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
    const where = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
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

    return this.toTaskResponse(task);
  }

  async remove(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    await this.assertCanMutateTasks(userId, organizationId, projectId);
    await this.getTaskInProject(projectId, taskId);

    await this.prisma.task.delete({
      where: { id: taskId },
    });
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
