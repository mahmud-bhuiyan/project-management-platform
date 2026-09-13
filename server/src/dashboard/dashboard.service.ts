import { Injectable } from '@nestjs/common';
import { ProjectStatus, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import type { DashboardStats } from './dashboard.types.js';

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
    ]);

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
    };
  }
}
