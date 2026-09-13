import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType } from './notification.types.js';
import { NotificationsService } from './notifications.service.js';
import {
  extractMentionHandles,
  resolveMentionedUserIds,
} from './utils/mention.util.js';
import { taskStatusLabel } from './utils/task-status-label.util.js';

@Injectable()
export class NotificationTriggersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async notifyTaskAssigned(params: {
    actorId: string;
    assigneeId: string;
    organizationId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    actorName: string;
  }): Promise<void> {
    if (params.assigneeId === params.actorId) {
      return;
    }

    await this.notificationsService.create({
      userId: params.assigneeId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Task assigned to you',
      body: `${params.actorName} assigned you to "${params.taskTitle}".`,
      metadata: {
        organizationId: params.organizationId,
        projectId: params.projectId,
        taskId: params.taskId,
        actorId: params.actorId,
      },
    });
  }

  async notifyTaskStatusChanged(params: {
    actorId: string;
    assigneeId: string;
    organizationId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    actorName: string;
    from: TaskStatus;
    to: TaskStatus;
  }): Promise<void> {
    if (params.assigneeId === params.actorId) {
      return;
    }

    await this.notificationsService.create({
      userId: params.assigneeId,
      type: NotificationType.TASK_STATUS_CHANGED,
      title: 'Task status updated',
      body: `${params.actorName} moved "${params.taskTitle}" from ${taskStatusLabel(params.from)} to ${taskStatusLabel(params.to)}.`,
      metadata: {
        organizationId: params.organizationId,
        projectId: params.projectId,
        taskId: params.taskId,
        actorId: params.actorId,
        from: params.from,
        to: params.to,
      },
    });
  }

  async notifyCommentMentions(params: {
    actorId: string;
    authorName: string;
    organizationId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    commentId: string;
    body: string;
  }): Promise<void> {
    const handles = extractMentionHandles(params.body);
    if (handles.length === 0) {
      return;
    }

    const projectMembers = await this.prisma.projectMember.findMany({
      where: { projectId: params.projectId },
      include: { user: true },
    });

    const mentionedUserIds = resolveMentionedUserIds(
      handles,
      projectMembers.map((member) => ({
        userId: member.userId,
        email: member.user.email,
        name: member.user.name,
      })),
      params.actorId,
    );

    await Promise.all(
      mentionedUserIds.map((userId) =>
        this.notificationsService.create({
          userId,
          type: NotificationType.MENTION,
          title: 'You were mentioned',
          body: `${params.authorName} mentioned you on "${params.taskTitle}": ${params.body}`,
          metadata: {
            organizationId: params.organizationId,
            projectId: params.projectId,
            taskId: params.taskId,
            commentId: params.commentId,
            actorId: params.actorId,
          },
        }),
      ),
    );
  }

}
