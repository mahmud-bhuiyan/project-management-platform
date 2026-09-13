import { Injectable } from '@nestjs/common';
import {
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import type {
  DashboardCharts,
  DashboardStats,
  ProjectProgressItem,
  TaskPriorityCount,
  TaskStatusCount,
} from './dashboard.types.js';

const TASK_STATUSES = Object.values(TaskStatus);
const TASK_PRIORITIES = Object.values(TaskPriority);
const MAX_PROJECT_PROGRESS_ITEMS = 10;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async getStats(userId: string, organizationId: string): Promise<DashboardStats> {
    await this.organizationsService.findOneForUser(userId, organizationId);

    const now = new Date();

    const [
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      charts,
    ] = await Promise.all([
      this.prisma.project.count({
        where: { organizationId, archivedAt: null },
      }),
      this.prisma.project.count({
        where: {
          organizationId,
          archivedAt: null,
          status: ProjectStatus.ACTIVE,
        },
      }),
      this.prisma.task.count({
        where: { project: { organizationId } },
      }),
      this.prisma.task.count({
        where: {
          project: { organizationId },
          status: TaskStatus.DONE,
        },
      }),
      this.prisma.task.count({
        where: {
          project: { organizationId },
          status: { not: TaskStatus.DONE },
          dueDate: { lt: now },
        },
      }),
      this.getCharts(organizationId),
    ]);

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      charts,
    };
  }

  private async getCharts(organizationId: string): Promise<DashboardCharts> {
    const [tasksByStatus, tasksByPriority, projectProgress] = await Promise.all([
      this.getTasksByStatus(organizationId),
      this.getTasksByPriority(organizationId),
      this.getProjectProgress(organizationId),
    ]);

    return {
      tasksByStatus,
      tasksByPriority,
      projectProgress,
    };
  }

  private async getTasksByStatus(
    organizationId: string,
  ): Promise<TaskStatusCount[]> {
    const groups = await this.prisma.task.groupBy({
      by: ['status'],
      where: { project: { organizationId } },
      _count: { _all: true },
    });

    const countByStatus = new Map(
      groups.map((group) => [group.status, group._count._all]),
    );

    return TASK_STATUSES.map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
    }));
  }

  private async getTasksByPriority(
    organizationId: string,
  ): Promise<TaskPriorityCount[]> {
    const groups = await this.prisma.task.groupBy({
      by: ['priority'],
      where: { project: { organizationId } },
      _count: { _all: true },
    });

    const countByPriority = new Map(
      groups.map((group) => [group.priority, group._count._all]),
    );

    return TASK_PRIORITIES.map((priority) => ({
      priority,
      count: countByPriority.get(priority) ?? 0,
    }));
  }

  private async getProjectProgress(
    organizationId: string,
  ): Promise<ProjectProgressItem[]> {
    const [projects, completedGroups] = await Promise.all([
      this.prisma.project.findMany({
        where: { organizationId, archivedAt: null },
        select: {
          id: true,
          name: true,
          _count: {
            select: { tasks: true },
          },
        },
      }),
      this.prisma.task.groupBy({
        by: ['projectId'],
        where: {
          project: { organizationId, archivedAt: null },
          status: TaskStatus.DONE,
        },
        _count: { _all: true },
      }),
    ]);

    const completedByProject = new Map(
      completedGroups.map((group) => [group.projectId, group._count._all]),
    );

    return projects
      .map((project) => ({
        projectId: project.id,
        projectName: project.name,
        totalTasks: project._count.tasks,
        completedTasks: completedByProject.get(project.id) ?? 0,
      }))
      .filter((project) => project.totalTasks > 0)
      .sort((left, right) => right.totalTasks - left.totalTasks)
      .slice(0, MAX_PROJECT_PROGRESS_ITEMS);
  }
}
