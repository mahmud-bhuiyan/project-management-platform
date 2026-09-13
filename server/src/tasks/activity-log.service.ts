import { HttpStatus, Injectable } from '@nestjs/common';
import type { ActivityLog, User } from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { UsersService } from '../users/users.service.js';
import type {
  ActivityLogResponse,
  RecordActivityInput,
} from './activity.types.js';
import type { TaskUserSummary } from './tasks.types.js';

const activityInclude = {
  actor: true,
} as const;

@Injectable()
export class ActivityLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
  ) {}

  async record(input: RecordActivityInput): Promise<ActivityLogResponse> {
    const activity = await this.prisma.activityLog.create({
      data: {
        taskId: input.taskId,
        actorId: input.actorId,
        action: input.action,
        metadata: input.metadata ?? {},
      },
      include: activityInclude,
    });

    return this.toActivityResponse(activity);
  }

  async findAllForTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<ActivityLogResponse[]> {
    await this.projectsService.assertCanAccessProject(
      userId,
      organizationId,
      projectId,
    );
    await this.assertTaskInProject(projectId, taskId);

    const activities = await this.prisma.activityLog.findMany({
      where: { taskId },
      include: activityInclude,
      orderBy: [{ createdAt: 'asc' }],
    });

    return activities.map((activity) => this.toActivityResponse(activity));
  }

  private async assertTaskInProject(
    projectId: string,
    taskId: string,
  ): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });

    if (!task) {
      throw new ApiException(
        'Task not found',
        'TASK_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private toActivityResponse(
    activity: ActivityLog & { actor: User },
  ): ActivityLogResponse {
    const safeActor = this.usersService.toSafeUser(activity.actor);

    return {
      ...activity,
      actor: this.toActorSummary(safeActor),
    };
  }

  private toActorSummary(user: {
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
