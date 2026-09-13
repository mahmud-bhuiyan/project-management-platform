import { HttpStatus, Injectable } from '@nestjs/common';
import {
  OrganizationRole,
  ProjectStatus,
  type Project,
  type User,
} from '@prisma/client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { OrganizationsService } from '../organizations/organizations.service.js';
import { canManageOrganizationMembers } from '../organizations/utils/organization-role.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import type {
  CreateProjectInput,
  ProjectOwnerSummary,
  ProjectResponse,
  UpdateProjectInput,
} from './projects.types.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    input: CreateProjectInput,
  ): Promise<ProjectResponse> {
    const membership = await this.organizationsService.getMembershipForUser(
      userId,
      organizationId,
    );
    this.assertCanManageProjects(membership.role);

    const ownerId = input.ownerId ?? userId;
    await this.assertOwnerIsOrganizationMember(organizationId, ownerId);

    this.assertStatusIsNotArchived(input.status);

    const project = await this.prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          organizationId,
          name: input.name,
          description: input.description ?? '',
          status: input.status ?? ProjectStatus.PLANNING,
          priority: input.priority,
          ownerId,
          startDate: input.startDate,
          dueDate: input.dueDate,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: createdProject.id,
          userId: ownerId,
          role: OrganizationRole.OWNER,
        },
      });

      return tx.project.findUniqueOrThrow({
        where: { id: createdProject.id },
        include: { owner: true },
      });
    });

    return this.toProjectResponse(project);
  }

  async findAllForOrganization(
    userId: string,
    organizationId: string,
    includeArchived = false,
  ): Promise<ProjectResponse[]> {
    await this.organizationsService.findOneForUser(userId, organizationId);

    const projects = await this.prisma.project.findMany({
      where: {
        organizationId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      include: { owner: true },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    });

    return projects.map((project) => this.toProjectResponse(project));
  }

  async findOneForOrganization(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<ProjectResponse> {
    await this.assertCanAccessProject(userId, organizationId, projectId);

    const project = await this.getProjectInOrganization(
      organizationId,
      projectId,
    );

    return this.toProjectResponse(project);
  }

  async getProjectForOrganization(organizationId: string, projectId: string) {
    return this.getProjectInOrganization(organizationId, projectId);
  }

  async assertCanAccessProject(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const membership = await this.organizationsService.getMembershipForUser(
      userId,
      organizationId,
    );

    if (canManageOrganizationMembers(membership.role)) {
      return;
    }

    const projectMembership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!projectMembership) {
      throw new ApiException(
        'Insufficient project permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async update(
    userId: string,
    organizationId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectResponse> {
    const membership = await this.organizationsService.getMembershipForUser(
      userId,
      organizationId,
    );
    this.assertCanManageProjects(membership.role);

    const existingProject = await this.getProjectInOrganization(
      organizationId,
      projectId,
    );

    if (existingProject.archivedAt) {
      throw new ApiException(
        'Archived projects cannot be updated',
        'PROJECT_ARCHIVED',
        HttpStatus.CONFLICT,
      );
    }

    this.assertStatusIsNotArchived(input.status);

    if (input.ownerId) {
      await this.assertOwnerIsOrganizationMember(organizationId, input.ownerId);
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate }
          : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      },
      include: { owner: true },
    });

    return this.toProjectResponse(project);
  }

  async archive(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<ProjectResponse> {
    const membership = await this.organizationsService.getMembershipForUser(
      userId,
      organizationId,
    );
    this.assertCanManageProjects(membership.role);

    const existingProject = await this.getProjectInOrganization(
      organizationId,
      projectId,
    );

    if (existingProject.archivedAt) {
      return this.toProjectResponse(existingProject);
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.ARCHIVED,
        archivedAt: new Date(),
      },
      include: { owner: true },
    });

    return this.toProjectResponse(project);
  }

  async remove(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const membership = await this.organizationsService.getMembershipForUser(
      userId,
      organizationId,
    );
    this.assertCanManageProjects(membership.role);

    await this.getProjectInOrganization(organizationId, projectId);

    await this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  private async getProjectInOrganization(
    organizationId: string,
    projectId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      include: { owner: true },
    });

    if (!project) {
      throw new ApiException(
        'Project not found',
        'PROJECT_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return project;
  }

  private async assertOwnerIsOrganizationMember(
    organizationId: string,
    ownerId: string,
  ): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: ownerId,
        },
      },
    });

    if (!membership) {
      throw new ApiException(
        'Project owner must be a member of the organization',
        'INVALID_PROJECT_OWNER',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private assertStatusIsNotArchived(status?: ProjectStatus): void {
    if (status === ProjectStatus.ARCHIVED) {
      throw new ApiException(
        'Use the archive endpoint to archive a project',
        'INVALID_PROJECT_STATUS',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private assertCanManageProjects(role: OrganizationRole): void {
    if (!canManageOrganizationMembers(role)) {
      throw new ApiException(
        'Insufficient organization permissions',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private toProjectResponse(
    project: Project & { owner: User },
  ): ProjectResponse {
    return {
      ...project,
      owner: this.toProjectOwnerSummary(project.owner),
    };
  }

  private toProjectOwnerSummary(user: User): ProjectOwnerSummary {
    const safeUser = this.usersService.toSafeUser(user);
    return {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      avatarUrl: safeUser.avatarUrl,
    };
  }
}
